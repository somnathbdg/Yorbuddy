/**
 * Facebook Publisher Service for YorBuddy
 * 
 * Handles publishing posts to the YorBuddy Facebook Page via the
 * Meta Graph API (v26.0). Uses FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN
 * from environment variables.
 * 
 * Supports:
 * - Text-only posts
 * - Posts with images (multipart form upload)
 * - Link posts
 * 
 * Never logs, displays, or reveals the access token.
 */

interface GraphApiSuccess {
  id: string;
}

interface GraphApiError {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

interface VerificationResult {
  success: boolean;
  postId?: string;
  message?: string;
  createdAt?: string;
  error?: string;
}

interface PostData {
  id?: string;
  message?: string;
  created_time?: string;
  error?: { message: string };
}

interface InsightsResponse {
  data?: Array<{
    values?: Array<{ value?: number }>;
  }>;
  error?: { message: string };
}

interface MeData {
  id?: string;
  name?: string;
  error?: { message: string };
}

interface DeleteResponse {
  success: boolean;
  error?: { message: string };
}

function buildFullPostId(pageId: string, postId: string): string {
  return `${pageId}_${postId}`;
}

/**
 * Publish a text post to the YorBuddy Facebook Page
 */
export async function publishPost(message: string): Promise<PublishResult> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    return {
      success: false,
      error: 'FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN is not set',
    };
  }

  const apiVersion = process.env.FACEBOOK_API_VERSION || 'v26.0';
  const url = `https://graph.facebook.com/${apiVersion}/${pageId}/feed`;

  const params = new URLSearchParams({
    message,
    access_token: accessToken,
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: params,
    });

    const data = (await response.json()) as GraphApiSuccess | GraphApiError;

    if (!response.ok || 'error' in data) {
      const errorData = data as GraphApiError;
      return {
        success: false,
        error: `(${errorData.error.type} #${errorData.error.code}) ${errorData.error.message}`,
      };
    }

    const successData = data as GraphApiSuccess;
    return {
      success: true,
      postId: buildFullPostId(pageId, successData.id),
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Network/parse error: ${err.message || 'Unknown error'}`,
    };
  }
}

/**
 * Publish a post with an image
 * 
 * @param message - The post caption/message
 * @param imagePath - Local path to the image file
 */
export async function publishPostWithImage(
  message: string,
  imagePath: string
): Promise<PublishResult> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    return {
      success: false,
      error: 'FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN is not set',
    };
  }

  const apiVersion = process.env.FACEBOOK_API_VERSION || 'v26.0';
  const url = `https://graph.facebook.com/${apiVersion}/${pageId}/photos`;

  // Build multipart form data
  const formData = new FormData();
  formData.append('message', message);
  formData.append('access_token', accessToken);

  try {
    const fs = await import('fs/promises');
    const imageBuffer = await fs.readFile(imagePath);
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('source', blob, 'post.png');

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = (await response.json()) as GraphApiSuccess | GraphApiError;

    if (!response.ok || 'error' in data) {
      const errorData = data as GraphApiError;
      return {
        success: false,
        error: `(${errorData.error.type} #${errorData.error.code}) ${errorData.error.message}`,
      };
    }

    const successData = data as GraphApiSuccess;
    // Photo posts use post_id for the full post ID
    return {
      success: true,
      postId: buildFullPostId(pageId, successData.id),
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Network/parse error: ${err.message || 'Unknown error'}`,
    };
  }
}

/**
 * Publish a link post
 */
export async function publishLinkPost(
  message: string,
  link: string
): Promise<PublishResult> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    return {
      success: false,
      error: 'FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN is not set',
    };
  }

  const apiVersion = process.env.FACEBOOK_API_VERSION || 'v26.0';
  const url = `https://graph.facebook.com/${apiVersion}/${pageId}/feed`;

  const params = new URLSearchParams({
    message,
    link,
    access_token: accessToken,
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: params,
    });

    const data = (await response.json()) as GraphApiSuccess | GraphApiError;

    if (!response.ok || 'error' in data) {
      const errorData = data as GraphApiError;
      return {
        success: false,
        error: `(${errorData.error.type} #${errorData.error.code}) ${errorData.error.message}`,
      };
    }

    const successData = data as GraphApiSuccess;
    return {
      success: true,
      postId: buildFullPostId(pageId, successData.id),
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Network/parse error: ${err.message || 'Unknown error'}`,
    };
  }
}

/**
 * Verify a post exists on the Facebook Page by querying the Graph API
 */
export async function verifyPost(postId: string): Promise<VerificationResult> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    return {
      success: false,
      error: 'FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN is not set',
    };
  }

  const apiVersion = process.env.FACEBOOK_API_VERSION || 'v26.0';
  const url = `https://graph.facebook.com/${apiVersion}/${postId}?fields=id,message,created_time&access_token=${accessToken}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return {
        success: false,
        postId,
        message: `HTTP ${response.status}: Post verification failed`,
      };
    }

    const data = (await response.json()) as PostData;

    if (data.error) {
      return {
        success: false,
        postId,
        message: data.error.message,
      };
    }

    return {
      success: true,
      postId: data.id || postId,
      message: data.message?.substring(0, 100) || 'Post verified',
      createdAt: data.created_time,
    };
  } catch (err: any) {
    return {
      success: false,
      postId,
      message: `Verification error: ${err.message || 'Unknown error'}`,
    };
  }
}

/**
 * Delete a post from the Facebook Page
 */
export async function deletePost(
  postId: string
): Promise<{ success: boolean; error?: string }> {
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!accessToken) {
    return {
      success: false,
      error: 'FACEBOOK_PAGE_ACCESS_TOKEN is not set',
    };
  }

  const apiVersion = process.env.FACEBOOK_API_VERSION || 'v26.0';
  const url = `https://graph.facebook.com/${apiVersion}/${postId}`;

  const params = new URLSearchParams({
    access_token: accessToken,
  });

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      body: params,
    });

    const data = (await response.json()) as DeleteResponse;

    if (!response.ok || (data.error && !data.success)) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: `Network/parse error: ${err.message || 'Unknown error'}`,
    };
  }
}

/**
 * Get post insights
 */
export async function getPostInsights(
  postId: string
): Promise<{
  success: boolean;
  impressions?: number;
  reach?: number;
  engagedUsers?: number;
  error?: string;
}> {
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!accessToken) {
    return {
      success: false,
      error: 'FACEBOOK_PAGE_ACCESS_TOKEN is not set',
    };
  }

  const apiVersion = process.env.FACEBOOK_API_VERSION || 'v26.0';
  const metrics = 'post_impressions,post_impressions_unique,post_engaged_users';
  const url = `https://graph.facebook.com/${apiVersion}/${postId}/insights?metric=${metrics}&access_token=${accessToken}`;

  try {
    const response = await fetch(url);
    const data = (await response.json()) as InsightsResponse;

    if (!response.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      impressions: data.data?.[0]?.values?.[0]?.value,
      reach: data.data?.[1]?.values?.[0]?.value,
      engagedUsers: data.data?.[2]?.values?.[0]?.value,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Insights error: ${err.message || 'Unknown error'}`,
    };
  }
}

/**
 * Check if the required environment variables are set
 * and the token is valid (by querying /me)
 */
export async function checkConnection(): Promise<{
  success: boolean;
  error?: string;
  pageId?: string;
}> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    return {
      success: false,
      error: `Missing: ${!pageId ? 'FACEBOOK_PAGE_ID' : ''} ${!accessToken ? 'FACEBOOK_PAGE_ACCESS_TOKEN' : ''}`.trim(),
    };
  }

  const apiVersion = process.env.FACEBOOK_API_VERSION || 'v26.0';
  const url = `https://graph.facebook.com/${apiVersion}/me?fields=id,name&access_token=${accessToken}`;

  try {
    const response = await fetch(url);
    const data = (await response.json()) as MeData;

    if (!response.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      pageId: data.id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Connection error: ${err.message || 'Unknown error'}`,
    };
  }
}

export const facebookPublisher = {
  publishPost,
  publishPostWithImage,
  publishLinkPost,
  verifyPost,
  deletePost,
  getPostInsights,
  checkConnection,
};
