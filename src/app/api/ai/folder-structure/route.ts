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

    const { projectType, projectDescription, customRequirements } = await request.json()

    if (!projectType) {
      return NextResponse.json({ error: 'Project type is required' }, { status: 400 })
    }

    // Initialize Anthropic client inside handler to ensure env var is available
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY is not configured')
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    // Log key prefix for debugging (safe - only shows first few chars)
    console.log('API key prefix:', apiKey.substring(0, 12) + '...')

    const anthropic = new Anthropic({ apiKey })

    const prompt = `Du är en expert på att organisera byggprojektdokument i Sverige. Skapa en mappstruktur för följande projekt:

Projekttyp: ${projectType}
${projectDescription ? `Beskrivning: ${projectDescription}` : ''}
${customRequirements ? `Särskilda krav: ${customRequirements}` : ''}

Skapa en logisk mappstruktur som följer svenska byggbranschens standarder och best practices.

Returnera svaret som ett JSON-objekt med följande format:
{
  "folders": [
    { "path": "/Ritningar", "description": "Alla ritningar för projektet" },
    { "path": "/Ritningar/Arkitekt", "description": "Arkitektritningar" },
    { "path": "/Ritningar/Konstruktion", "description": "Konstruktionsritningar" },
    ...
  ],
  "explanation": "Kort förklaring av strukturen"
}

Mapparna ska vara:
- Relevanta för projekttypen
- Organiserade hierarkiskt
- Namngivna på svenska
- Följa AMA-systemet och svenska branschstandarder där tillämpligt
- Inkludera administrativa mappar, tekniska dokumentmappar, och kvalitetsdokumentation

Ge ENDAST JSON-objektet som svar, utan markdown-formatering eller extra text.`

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

    // Extract the text content
    const textContent = message.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    // Parse the JSON response
    let folderStructure
    try {
      folderStructure = JSON.parse(textContent.text)
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        folderStructure = JSON.parse(jsonMatch[0])
      } else {
        return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 })
      }
    }

    return NextResponse.json(folderStructure)
  } catch (error) {
    console.error('AI folder structure error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to generate folder structure: ${errorMessage}` },
      { status: 500 }
    )
  }
}
