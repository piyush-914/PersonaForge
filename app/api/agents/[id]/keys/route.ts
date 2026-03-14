import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Agent from '@/models/Agent'
import { verifyToken } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config-simple'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params
    const { keyName, keyValue } = await request.json()

    if (!keyName || !keyValue) {
      return NextResponse.json({ error: 'Key name and value are required' }, { status: 400 })
    }

    let userId: string
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const decoded = verifyToken(token)
      userId = decoded.userId
    } else {
      const session = await getServerSession(authOptions)
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = session.user.id
    }

    const agent = await Agent.findOne({ _id: id, userId })
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Update API keys
    if (!agent.apiKeys) {
      agent.apiKeys = {}
    }
    
    // Convert Map behavior if needed, but since we defined it as Record<string, string> in interface and Map in schema
    // Agent model will handle it.
    agent.apiKeys.set(keyName, keyValue)
    await agent.save()

    return NextResponse.json({ message: 'API key updated successfully' }, { status: 200 })

  } catch (error: any) {
    console.error('Update API key error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
