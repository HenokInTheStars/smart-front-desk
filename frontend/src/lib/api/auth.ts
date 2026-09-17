const getBaseUrl = () => process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function loginUser(email: string, password: string) {
    const response = await fetch(`${getBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        throw new Error('Login failed. Invalid credentials.');
    }

    const result = await response.json();
    return result.data !== undefined ? result.data : result;
}

export async function getMe(accessToken: string) {
    const response = await fetch(`${getBaseUrl()}/auth/me`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
        throw new Error('Failed to get user profile.');
    }

    const result = await response.json();
    return result.data !== undefined ? result.data : result;
}
