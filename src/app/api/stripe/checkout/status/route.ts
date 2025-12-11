import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.json(
      { error: 'session_id is required' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get session from Stripe
    const session = await getStripe().checkout.sessions.retrieve(sessionId)

    if (!session.metadata?.user_id || session.metadata.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Check if project was created
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('name', session.metadata.project_name)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (project) {
      return NextResponse.json({
        status: 'complete',
        project_id: project.id,
      })
    }

    // Check Stripe session status
    if (session.payment_status === 'paid') {
      // Payment complete but project not yet created (webhook pending)
      return NextResponse.json({
        status: 'pending',
        message: 'Payment received, creating project...',
      })
    }

    return NextResponse.json({
      status: 'pending',
      message: 'Waiting for payment confirmation...',
    })

  } catch (error) {
    console.error('Error checking checkout status:', error)
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    )
  }
}
