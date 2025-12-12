import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

interface ProjectMember {
  id: string
  name: string | null
  email: string
  company?: string
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { text, project_members } = await request.json()

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Initialize Anthropic client
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY is not configured')
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    const anthropic = new Anthropic({ apiKey })

    // Build member context for matching
    const membersContext = project_members && project_members.length > 0
      ? `\n\nProjektmedlemmar som kan tilldelas uppgifter:\n${project_members.map((m: ProjectMember) =>
          `- ${m.name || m.email}${m.company ? ` (${m.company})` : ''}`
        ).join('\n')}`
      : ''

    const prompt = `Du är en expert på att extrahera åtgärdspunkter och uppgifter från mötesanteckningar på svenska. Analysera följande text och identifiera alla uppgifter, åtgärder eller "to-dos" som nämns.

Text att analysera:
${text}
${membersContext}

Identifiera alla åtgärdspunkter och försök matcha ansvariga personer mot projektmedlemmarna om möjligt.

Leta efter:
- Explicita åtaganden ("X ska göra Y")
- Uppgifter med deadlines ("senast fredag", "innan nästa möte")
- Öppna frågor som kräver åtgärd
- Beslut som kräver uppföljning

Svara ENDAST med ett giltigt JSON-objekt i detta format:
{
  "actions": [
    {
      "description": "Beskrivning av åtgärden",
      "assigned_to_name": "Namn på ansvarig person (eller null om okänt)",
      "deadline": "2024-01-15 (ISO-datum om nämnt, annars null)",
      "priority": "medium",
      "source_text": "Den del av texten som åtgärden baseras på"
    }
  ],
  "notes": "Eventuella kommentarer om extraktionen"
}

Riktlinjer för priority:
- critical: Akuta säkerhetsproblem, blockerande issues
- high: Viktiga uppgifter med snart deadline
- medium: Normala uppgifter
- low: Uppgifter som kan vänta

VIKTIGT:
- Skriv på svenska
- Var specifik i beskrivningarna
- Om flera personer nämns för samma uppgift, skapa separata åtgärdspunkter
- Returnera ENDAST giltig JSON, ingen annan text
- Om inga åtgärder hittas, returnera {"actions": [], "notes": "Inga åtgärdspunkter identifierades"}`

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
        error: 'AI-svaret blev avkortat. Försök med kortare text.',
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
    if (!result.actions || !Array.isArray(result.actions)) {
      return NextResponse.json({ error: 'Ogiltigt svarsformat från AI' }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('AI extract actions error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Kunde inte extrahera åtgärder: ${errorMessage}` },
      { status: 500 }
    )
  }
}
