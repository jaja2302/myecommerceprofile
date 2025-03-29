import { NextApiRequest, NextApiResponse } from 'next';
import * as Ably from 'ably';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check for required environment variable
    const apiKey = process.env.ABLY_API_KEY;
    
    // // More detailed debugging
    // console.log("Environment variables:", {
    //   NODE_ENV: process.env.NODE_ENV,
    //   ABLY_API_KEY_EXISTS: !!process.env.ABLY_API_KEY,
    //   ABLY_API_KEY_LENGTH: process.env.ABLY_API_KEY?.length
    // });
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Missing ABLY_API_KEY environment variable' 
      });
    }

    // Get clientId from request if provided
    const clientId = req.query.clientId as string || req.body?.clientId;
    
    // Create Ably REST client
    const client = new Ably.Rest(apiKey);
    
    // Create token request with optional clientId and explicit capabilities
    const tokenParams: Ably.TokenParams = {
      capability: {
        "*": ["publish", "subscribe", "presence", "history", "channel-metadata"],
        "waiting:*": ["publish", "subscribe", "presence", "history", "channel-metadata"],
        "chat:*": ["publish", "subscribe", "presence", "history", "channel-metadata"]
      }
    };
    
    if (clientId) {
      tokenParams.clientId = clientId;
    }
    
    // Request token from Ably
    const tokenRequest = await client.auth.createTokenRequest(tokenParams);
    
    // Return token request to client
    return res.status(200).json(tokenRequest);
  } catch (error) {
    console.error('Error creating Ably token:', error);
    return res.status(500).json({ 
      error: 'Error creating Ably token',
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
} 