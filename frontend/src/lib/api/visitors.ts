const getBaseUrl = () => process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function checkinVisitor(data: any) {
    const response = await fetch(`${getBaseUrl()}/visitors/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error('Failed to complete check-in. Please try again.');
    }

    const result = await response.json();
    return result.data !== undefined ? result.data : result;
}

export async function scheduleSlot(data: any) {
    const response = await fetch(`${getBaseUrl()}/visitors/schedule-slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error('Failed to schedule appointment.');
    }

    const result = await response.json();
    return result.data !== undefined ? result.data : result;
}
