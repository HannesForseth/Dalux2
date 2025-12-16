import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import type { ProjectPlan, StorageAddon } from '@/types/database'

interface CheckoutRequestBody {
  plan_id: string
  extra_users: number
  storage_addon_ids: string[]
  project_name: string
  project_number?: string
  address?: string
  city?: string
  upgrade_project_id?: string // ID of existing project to upgrade
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad' },
        { status: 401 }
      )
    }

    const body: CheckoutRequestBody = await request.json()
    const { plan_id, extra_users, storage_addon_ids, project_name, project_number, address, city, upgrade_project_id } = body

    // Validate required fields
    if (!plan_id || !project_name) {
      return NextResponse.json(
        { error: 'Plan och projektnamn krävs' },
        { status: 400 }
      )
    }

    // If upgrading, verify user is owner of the project
    if (upgrade_project_id) {
      const { data: member } = await supabase
        .from('project_members')
        .select(`
          id,
          role:project_roles!inner(name)
        `)
        .eq('project_id', upgrade_project_id)
        .eq('user_id', user.id)
        .single()

      if (!member) {
        return NextResponse.json(
          { error: 'Du har inte behörighet till detta projekt' },
          { status: 403 }
        )
      }

      const roleName = (member.role as unknown as { name: string })?.name
      if (roleName !== 'owner') {
        return NextResponse.json(
          { error: 'Endast projektägaren kan uppgradera prenumerationen' },
          { status: 403 }
        )
      }
    }

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('project_plans')
      .select('*')
      .eq('id', plan_id)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Kunde inte hitta vald plan' },
        { status: 404 }
      )
    }

    const typedPlan = plan as ProjectPlan

    // Free plan - create project directly without Stripe
    if (typedPlan.name === 'free') {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: project_name,
          project_number,
          address,
          city,
          created_by: user.id,
          plan_id: plan_id,
          status: 'active',
        })
        .select()
        .single()

      if (projectError) {
        console.error('Error creating free project:', projectError)
        return NextResponse.json(
          { error: 'Kunde inte skapa projekt' },
          { status: 500 }
        )
      }

      // Create subscription record for free plan
      await supabase
        .from('project_subscriptions')
        .insert({
          project_id: project.id,
          plan_id: plan_id,
          status: 'active',
          extra_users: 0,
          extra_storage_mb: 0,
          storage_addon_ids: [],
        })

      // Add user as project owner
      const { data: ownerRole } = await supabase
        .from('project_roles')
        .select('id')
        .eq('name', 'owner')
        .single()

      if (ownerRole) {
        await supabase
          .from('project_members')
          .insert({
            project_id: project.id,
            user_id: user.id,
            role_id: ownerRole.id,
            status: 'active',
            joined_at: new Date().toISOString(),
          })
      }

      return NextResponse.json({
        success: true,
        project_id: project.id,
        redirect_url: `/dashboard/projects/${project.id}`,
      })
    }

    // Paid plan - create Stripe Checkout Session
    const lineItems: {
      price_data: {
        currency: string
        product_data: { name: string; description?: string }
        unit_amount: number
        recurring: { interval: 'month' }
      }
      quantity: number
    }[] = []

    // Base plan price
    if (typedPlan.base_price_monthly > 0) {
      lineItems.push({
        price_data: {
          currency: 'sek',
          product_data: {
            name: `${typedPlan.display_name} - Grundpaket`,
            description: `${typedPlan.included_users} användare, ${formatStorage(typedPlan.storage_mb)} lagring`,
          },
          unit_amount: typedPlan.base_price_monthly,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      })
    }

    // Extra users
    if (extra_users > 0 && typedPlan.extra_user_price > 0) {
      lineItems.push({
        price_data: {
          currency: 'sek',
          product_data: {
            name: 'Extra användare',
            description: `${extra_users} extra användare för ${typedPlan.display_name}`,
          },
          unit_amount: typedPlan.extra_user_price,
          recurring: { interval: 'month' },
        },
        quantity: extra_users,
      })
    }

    // Storage addons
    if (storage_addon_ids.length > 0) {
      const { data: addons } = await supabase
        .from('storage_addons')
        .select('*')
        .in('id', storage_addon_ids)

      if (addons) {
        for (const addon of addons as StorageAddon[]) {
          lineItems.push({
            price_data: {
              currency: 'sek',
              product_data: {
                name: `Lagring: ${addon.display_name}`,
                description: `Extra lagringsutrymme`,
              },
              unit_amount: addon.price_monthly,
              recurring: { interval: 'month' },
            },
            quantity: 1,
          })
        }
      }
    }

    // Get or create Stripe customer
    let stripeCustomerId: string

    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profile?.stripe_customer_id) {
      stripeCustomerId = profile.stripe_customer_id
    } else {
      // Create new Stripe customer
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      stripeCustomerId = customer.id

      // Save customer ID to profile (ignore if column doesn't exist)
      try {
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', user.id)
      } catch {
        // Ignore - column might not exist yet
      }
    }

    // Create Stripe Checkout Session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Different URLs for upgrade vs new project
    const successUrl = upgrade_project_id
      ? `${baseUrl}/projects/new/success?session_id={CHECKOUT_SESSION_ID}&upgrade=${upgrade_project_id}`
      : `${baseUrl}/projects/new/success?session_id={CHECKOUT_SESSION_ID}`

    const cancelUrl = upgrade_project_id
      ? `${baseUrl}/dashboard/projects/${upgrade_project_id}/settings?canceled=true`
      : `${baseUrl}/projects/new?canceled=true`

    const session = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user.id,
        plan_id: plan_id,
        extra_users: extra_users.toString(),
        storage_addon_ids: JSON.stringify(storage_addon_ids),
        project_name,
        project_number: project_number || '',
        address: address || '',
        city: city || '',
        upgrade_project_id: upgrade_project_id || '', // Include in metadata for webhook
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_id: plan_id,
          upgrade_project_id: upgrade_project_id || '',
        },
      },
      locale: 'sv',
      allow_promotion_codes: true,
    })

    return NextResponse.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    })

  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Ett fel uppstod vid skapande av betalning' },
      { status: 500 }
    )
  }
}

function formatStorage(mb: number): string {
  if (mb === -1) return 'Obegränsad'
  if (mb < 1024) return `${mb} MB`
  return `${(mb / 1024).toFixed(0)} GB`
}
