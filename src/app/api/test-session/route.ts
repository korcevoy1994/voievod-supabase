import { NextRequest, NextResponse } from 'next/server'
import { SecureSessionManager } from '@/lib/secureSessionManager'

export async function POST(request: NextRequest) {
  try {
    const sessionManager = new SecureSessionManager()
    const sessionId = sessionManager.createSession('test-user-123')
    
    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Test session created successfully'
    })
  } catch (error) {
    console.error('Error creating test session:', error)
    return NextResponse.json(
      { error: 'Failed to create test session' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionManager = new SecureSessionManager()
    const stats = sessionManager.getSessionStats()
    
    return NextResponse.json({
      success: true,
      stats,
      message: 'Session stats retrieved successfully'
    })
  } catch (error) {
    console.error('Error getting session stats:', error)
    return NextResponse.json(
      { error: 'Failed to get session stats' },
      { status: 500 }
    )
  }
}