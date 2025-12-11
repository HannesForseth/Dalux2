import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Create supabase admin client lazily
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  console.log(`Received Stripe event: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata
  if (!metadata) {
    console.error('No metadata in checkout session')
    return
  }

  const {
    user_id,
    plan_id,
    extra_users,
    storage_addon_ids,
    project_name,
    project_number,
    address,
    city,
  } = metadata

  console.log('Creating project from checkout:', { user_id, plan_id, project_name })

  // Create project
  const { data: project, error: projectError } = await getSupabaseAdmin()
    .from('projects')
    .insert({
      name: project_name,
      project_number: project_number || null,
      address: address || null,
      city: city || null,
      created_by: user_id,
      plan_id: plan_id,
      status: 'active',
    })
    .select()
    .single()

  if (projectError) {
    console.error('Error creating project:', projectError)
    throw projectError
  }

  // Calculate extra storage from addons
  let extraStorageMb = 0
  const addonIds = JSON.parse(storage_addon_ids || '[]')

  if (addonIds.length > 0) {
    const { data: addons } = await getSupabaseAdmin()
      .from('storage_addons')
      .select('storage_mb')
      .in('id', addonIds)

    if (addons) {
      extraStorageMb = addons.reduce((sum, addon) => sum + addon.storage_mb, 0)
    }
  }

  // Create subscription record
  const { error: subError } = await getSupabaseAdmin()
    .from('project_subscriptions')
    .insert({
      project_id: project.id,
      plan_id: plan_id,
      stripe_subscription_id: session.subscription as string,
      stripe_customer_id: session.customer as string,
      status: 'active',
      extra_users: parseInt(extra_users || '0'),
      extra_storage_mb: extraStorageMb,
      storage_addon_ids: addonIds,
      current_period_start: new Date().toISOString(),
    })

  if (subError) {
    console.error('Error creating subscription:', subError)
    throw subError
  }

  // Add user as project owner
  const { data: ownerRole } = await getSupabaseAdmin()
    .from('project_roles')
    .select('id')
    .eq('name', 'owner')
    .single()

  if (ownerRole) {
    await getSupabaseAdmin()
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: user_id,
        role_id: ownerRole.id,
        status: 'active',
        joined_at: new Date().toISOString(),
      })
  }

  console.log('Project created successfully:', project.id)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id

  const status = mapStripeStatus(subscription.status)
  // Access current_period_end from subscription object
  const subAny = subscription as unknown as { current_period_end?: number }
  const periodEnd = subAny.current_period_end
    ? new Date(subAny.current_period_end * 1000).toISOString()
    : null

  const { error } = await getSupabaseAdmin()
    .from('project_subscriptions')
    .update({
      status,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    console.error('Error updating subscription:', error)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id

  const { error } = await getSupabaseAdmin()
    .from('project_subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    console.error('Error canceling subscription:', error)
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Access subscription from invoice object
  const invoiceAny = invoice as unknown as { subscription?: string | { id: string }, lines?: { data: Array<{ period?: { end?: number } }> } }
  if (!invoiceAny.subscription) return

  const subscriptionId = typeof invoiceAny.subscription === 'string'
    ? invoiceAny.subscription
    : invoiceAny.subscription.id

  const periodEnd = invoiceAny.lines?.data[0]?.period?.end
    ? new Date(invoiceAny.lines.data[0].period.end * 1000).toISOString()
    : null

  const { error } = await getSupabaseAdmin()
    .from('project_subscriptions')
    .update({
      status: 'active',
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    console.error('Error updating subscription after payment:', error)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Access subscription from invoice object
  const invoiceAny = invoice as unknown as { subscription?: string | { id: string } }
  if (!invoiceAny.subscription) return

  const subscriptionId = typeof invoiceAny.subscription === 'string'
    ? invoiceAny.subscription
    : invoiceAny.subscription.id

  const { error } = await getSupabaseAdmin()
    .from('project_subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    console.error('Error marking subscription as past_due:', error)
  }
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    trialing: 'trialing',
    incomplete: 'past_due',
    incomplete_expired: 'canceled',
    unpaid: 'past_due',
    paused: 'past_due',
  }
  return statusMap[status] || 'active'
}
