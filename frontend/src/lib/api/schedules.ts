const getBaseUrl = () => process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function evaluateHostAvailability(data: any) {
    const response = await fetch(`${getBaseUrl()}/schedules/evaluate-host-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error('Failed to evaluate host availability');
    }

    return await response.json();
}
