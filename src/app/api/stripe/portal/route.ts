import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

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

    const body = await request.json()
    const { project_id } = body

    if (!project_id) {
      return NextResponse.json(
        { error: 'Projekt-ID krävs' },
        { status: 400 }
      )
    }

    // Verify user is project owner
    const { data: member } = await supabase
      .from('project_members')
      .select(`
        id,
        role:project_roles!inner(name)
      `)
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json(
        { error: 'Du har inte behörighet till detta projekt' },
        { status: 403 }
      )
    }

    // Check if user is owner
    const roleName = (member.role as unknown as { name: string })?.name
    if (roleName !== 'owner') {
      return NextResponse.json(
        { error: 'Endast projektägaren kan hantera prenumerationen' },
        { status: 403 }
      )
    }

    // Get subscription with stripe_customer_id
    const { data: subscription, error: subError } = await supabase
      .from('project_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subError || !subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Ingen betalande prenumeration hittades för detta projekt' },
        { status: 404 }
      )
    }

    // Create Stripe billing portal session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${baseUrl}/dashboard/projects/${project_id}/settings`,
    })

    return NextResponse.json({
      success: true,
      portal_url: portalSession.url,
    })

  } catch (error) {
    console.error('Stripe portal error:', error)
    return NextResponse.json(
      { error: 'Ett fel uppstod vid öppning av betalningsportalen' },
      { status: 500 }
    )
  }
}
