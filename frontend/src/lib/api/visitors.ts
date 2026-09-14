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

    return await response.json();
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

    return await response.json();
}
