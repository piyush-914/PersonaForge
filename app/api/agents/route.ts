import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Agent from '@/models/Agent'
import User from '@/models/User'
import { verifyToken } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config-simple'

// Get user's agents
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    let userId: string

    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const decoded = verifyToken(token)
      userId = decoded.userId
    } else {
      const session = await getServerSession(authOptions)
      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      userId = session.user.id

      // RESILIENCE: If userId is not a valid ObjectId, try to find the user by email
      if (!/^[0-9a-fA-F]{24}$/.test(userId) && session.user.email) {
        const dbUser = await User.findOne({ email: session.user.email })
        if (dbUser) {
          userId = dbUser._id.toString()
        }
      }
    }

    const agents = await Agent.find({ userId: userId })
      .sort({ createdAt: -1 })
      .select('-__v')

    return NextResponse.json({ agents }, { status: 200 })

  } catch (error: any) {
    console.error('Get agents error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create new agent
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    let userId: string

    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const decoded = verifyToken(token)
      userId = decoded.userId
    } else {
      const session = await getServerSession(authOptions)
      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      userId = session.user.id

      // RESILIENCE: If userId is not a valid ObjectId, try to find the user by email
      if (!/^[0-9a-fA-F]{24}$/.test(userId) && session.user.email) {
        const dbUser = await User.findOne({ email: session.user.email })
        if (dbUser) {
          userId = dbUser._id.toString()
        }
      }
    }

    const {
      name,
      description,
      systemPrompt,
      tone,
      domain,
      responseStyle,
      guardrails,
      memoryMode,
      responseLength,
      safetyFilters,
      tools,
      apiKeys
    } = await request.json()

    // Validation
    if (!name || !description || !systemPrompt || !tone || !domain || !responseStyle) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      )
    }

    // Check user's plan limits
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const agentCount = await Agent.countDocuments({ userId: userId })
    
    // Plan limits
    const planLimits = {
      starter: 5,
      pro: Infinity,
      enterprise: Infinity
    }

    if (agentCount >= planLimits[user.plan as keyof typeof planLimits]) {
      return NextResponse.json(
        { error: `Your ${user.plan} plan allows maximum ${planLimits[user.plan as keyof typeof planLimits]} agents` },
        { status: 403 }
      )
    }

    // Prevent rapid duplicates (e.g. from double clicks)
    const recentDuplicate = await Agent.findOne({
      userId,
      name,
      createdAt: { $gt: new Date(Date.now() - 10000) } // Created in last 10s
    })

    if (recentDuplicate) {
      return NextResponse.json(
        { message: 'Agent created successfully', agent: recentDuplicate }, 
        { status: 201 }
      )
    }

    // Create agent
    const agent = await Agent.create({
      userId: userId,
      name,
      description,
      systemPrompt,
      tone,
      domain,
      responseStyle,
      guardrails: guardrails || [],
      memoryMode: memoryMode || 'session',
      responseLength: responseLength || 'medium',
      safetyFilters: safetyFilters !== undefined ? safetyFilters : true,
      tools: tools || ['web_search', 'visit_url'],
      apiKeys: apiKeys || {}
    })

    // Update user's agent count
    user.agentsCreated += 1
    await user.save()

    return NextResponse.json({
      message: 'Agent created successfully',
      agent: {
        id: agent._id,
        name: agent.name,
        description: agent.description,
        tone: agent.tone,
        domain: agent.domain,
        responseStyle: agent.responseStyle,
        memoryMode: agent.memoryMode,
        responseLength: agent.responseLength,
        safetyFilters: agent.safetyFilters,
        isDeployed: agent.isDeployed,
        createdAt: agent.createdAt
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Create agent error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}