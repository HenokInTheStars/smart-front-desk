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

    const result = await response.json();
    return result.data !== undefined ? result.data : result;
}

export async function getHostSchedule(employeeId: string, token: string) {
    const response = await fetch(`${getBaseUrl()}/schedules/${employeeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to load schedule');
    const result = await response.json();
    return result.data !== undefined ? result.data : result;
}

export async function updateHostSchedule(employeeId: string, payload: any, token: string) {
    const response = await fetch(`${getBaseUrl()}/schedules/${employeeId}`, {
        method: 'PUT',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to update schedule');
    const result = await response.json();
    return result.data !== undefined ? result.data : result;
}
