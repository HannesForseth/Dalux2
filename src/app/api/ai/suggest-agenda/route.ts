import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { project_id, meeting_type, previous_protocol_id } = await request.json()

    if (!project_id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Initialize Anthropic client
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY is not configured')
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    // Fetch context from the project
    // 1. Open issues
    const { data: openIssues } = await supabase
      .from('issues')
      .select('id, title, status, priority')
      .eq('project_id', project_id)
      .in('status', ['open', 'in_progress'])
      .limit(10)

    // 2. Open deviations
    const { data: openDeviations } = await supabase
      .from('deviations')
      .select('id, title, status, severity')
      .eq('project_id', project_id)
      .in('status', ['reported', 'under_review', 'action_required'])
      .limit(10)

    // 3. Pending action items from previous protocols
    const { data: pendingActions } = await supabase
      .from('protocol_action_items')
      .select(`
        id, description, status, deadline, assigned_to_name,
        protocol:protocols!inner(project_id)
      `)
      .eq('protocols.project_id', project_id)
      .in('status', ['pending', 'in_progress'])
      .limit(10)

    // 4. Previous protocol if specified
    let previousProtocolContext = ''
    if (previous_protocol_id) {
      const { data: prevProtocol } = await supabase
        .from('protocols')
        .select(`
          title, meeting_type, notes,
          agenda_items:protocol_agenda_items(title, notes),
          decisions:protocol_decisions(description)
        `)
        .eq('id', previous_protocol_id)
        .single()

      if (prevProtocol) {
        previousProtocolContext = `
Föregående protokoll: ${prevProtocol.title}
Mötestyp: ${prevProtocol.meeting_type}
${prevProtocol.notes ? `Anteckningar: ${prevProtocol.notes.substring(0, 500)}...` : ''}
${prevProtocol.agenda_items && prevProtocol.agenda_items.length > 0
  ? `Tidigare dagordning:\n${prevProtocol.agenda_items.map((a: { title: string }) => `- ${a.title}`).join('\n')}`
  : ''}
${prevProtocol.decisions && prevProtocol.decisions.length > 0
  ? `Tidigare beslut:\n${prevProtocol.decisions.map((d: { description: string }) => `- ${d.description}`).join('\n')}`
  : ''}`
      }
    }

    // Build context
    const issuesContext = openIssues && openIssues.length > 0
      ? `\nÖppna ärenden:\n${openIssues.map(i => `- ${i.title} (${i.status}, ${i.priority})`).join('\n')}`
      : '\nInga öppna ärenden.'

    const deviationsContext = openDeviations && openDeviations.length > 0
      ? `\nÖppna avvikelser:\n${openDeviations.map(d => `- ${d.title} (${d.status}, ${d.severity})`).join('\n')}`
      : '\nInga öppna avvikelser.'

    const actionsContext = pendingActions && pendingActions.length > 0
      ? `\nPågående åtgärdspunkter:\n${pendingActions.map(a =>
          `- ${a.description}${a.assigned_to_name ? ` (${a.assigned_to_name})` : ''}${a.deadline ? ` - deadline: ${a.deadline}` : ''}`
        ).join('\n')}`
      : '\nInga pågående åtgärdspunkter.'

    const meetingTypeLabels: Record<string, string> = {
      byggmote: 'Byggmöte',
      projektmote: 'Projektmöte',
      samordningsmote: 'Samordningsmöte',
      startmote: 'Startmöte',
      slutmote: 'Slutmöte',
      besiktning: 'Besiktning',
      other: 'Övrigt möte',
    }

    const anthropic = new Anthropic({ apiKey })

    const prompt = `Du är en expert på att planera byggmöten i Sverige. Skapa ett förslag på dagordning baserat på följande projektkontext.

Mötestyp: ${meetingTypeLabels[meeting_type] || meeting_type || 'Projektmöte'}
${previousProtocolContext}
${issuesContext}
${deviationsContext}
${actionsContext}

Skapa en relevant dagordning för ${meetingTypeLabels[meeting_type] || 'mötet'}. Inkludera:
1. Standardpunkter för mötestypen (mötets öppnande, föregående protokoll, etc.)
2. Uppföljning av pågående åtgärder
3. Relevanta ärenden och avvikelser som behöver diskuteras
4. Eventuella nya punkter baserat på projektets status

Svara ENDAST med ett giltigt JSON-objekt i detta format:
{
  "suggestions": [
    {
      "title": "Dagordningspunkt",
      "description": "Kort beskrivning av vad som ska diskuteras",
      "source": "standard|action|issue|deviation|previous",
      "related_item_id": "uuid om kopplat till ärende/avvikelse, annars null",
      "duration_minutes": 10,
      "order_index": 1
    }
  ],
  "explanation": "Kort förklaring av dagordningsförslaget"
}

Riktlinjer:
- source anger varifrån förslaget kommer:
  - "standard": Standardpunkt för mötestypen
  - "action": Uppföljning av åtgärdspunkt
  - "issue": Kopplat till ärende
  - "deviation": Kopplat till avvikelse
  - "previous": Uppföljning från föregående möte
- Föreslå realistiska tidsuppskattningar (duration_minutes)
- Ordna punkterna i logisk ordning
- Inkludera alltid "Mötets öppnande" först och "Nästa möte/Avslut" sist

VIKTIGT:
- Skriv på svenska
- Returnera ENDAST giltig JSON, ingen annan text`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    if (message.stop_reason === 'max_tokens') {
      console.error('AI response was truncated')
      return NextResponse.json({
        error: 'AI-svaret blev avkortat.',
      }, { status: 500 })
    }

    const textContent = message.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'Inget svar från AI' }, { status: 500 })
    }

    // Parse JSON response
    let result
    let jsonText = textContent.text.trim()

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    // Extract JSON object
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    // Clean up trailing commas
    jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1')

    try {
      result = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Raw response:', textContent.text.substring(0, 500))
      return NextResponse.json({
        error: 'AI returnerade ogiltigt format',
        details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      }, { status: 500 })
    }

    // Validate structure
    if (!result.suggestions || !Array.isArray(result.suggestions)) {
      return NextResponse.json({ error: 'Ogiltigt svarsformat från AI' }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('AI suggest agenda error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Kunde inte generera dagordningsförslag: ${errorMessage}` },
      { status: 500 }
    )
  }
}
