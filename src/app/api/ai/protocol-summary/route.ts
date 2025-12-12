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

    const { notes, agenda_items, decisions } = await request.json()

    if (!notes && (!agenda_items || agenda_items.length === 0)) {
      return NextResponse.json({ error: 'Notes or agenda items are required' }, { status: 400 })
    }

    // Initialize Anthropic client
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY is not configured')
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    const anthropic = new Anthropic({ apiKey })

    // Build context from agenda items
    const agendaContext = agenda_items && agenda_items.length > 0
      ? `\n\nDagordningspunkter:\n${agenda_items.map((item: { order_index: number; title: string; notes?: string }, i: number) =>
          `${item.order_index || i + 1}. ${item.title}${item.notes ? `: ${item.notes}` : ''}`
        ).join('\n')}`
      : ''

    // Build context from decisions
    const decisionsContext = decisions && decisions.length > 0
      ? `\n\nBeslut som fattades:\n${decisions.map((d: { decision_number: number; description: string }, i: number) =>
          `- Beslut ${d.decision_number || i + 1}: ${d.description}`
        ).join('\n')}`
      : ''

    const prompt = `Du är en expert på att sammanfatta byggmötesprotokoll på svenska. Analysera följande mötesanteckningar och skapa en strukturerad sammanfattning.

Mötesanteckningar:
${notes || '(Inga anteckningar angivna)'}
${agendaContext}
${decisionsContext}

Skapa en sammanfattning som inkluderar:
1. En kortfattad övergripande sammanfattning av mötet (2-3 meningar)
2. Nyckelpunkter från diskussionerna (3-5 punkter)
3. Eventuella identifierade åtgärdspunkter eller uppgifter som behöver utföras

Svara ENDAST med ett giltigt JSON-objekt i detta format:
{
  "summary": "Övergripande sammanfattning av mötet...",
  "key_points": [
    "Nyckelpunkt 1",
    "Nyckelpunkt 2",
    "Nyckelpunkt 3"
  ],
  "extracted_actions": [
    {
      "description": "Åtgärd som behöver utföras",
      "assigned_to_name": "Ansvarig person om nämnd",
      "deadline": "2024-01-15 om datum nämnts, annars null",
      "priority": "medium"
    }
  ]
}

VIKTIGT:
- Skriv på svenska
- Var koncis men informativ
- Om ingen ansvarig nämns, sätt assigned_to_name till null
- Om inget deadline nämns, sätt deadline till null
- priority ska vara: low, medium, high, eller critical
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
        error: 'AI-svaret blev avkortat. Försök med kortare anteckningar.',
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
    if (!result.summary || !result.key_points || !Array.isArray(result.key_points)) {
      return NextResponse.json({ error: 'Ogiltigt svarsformat från AI' }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('AI protocol summary error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Kunde inte generera sammanfattning: ${errorMessage}` },
      { status: 500 }
    )
  }
}
