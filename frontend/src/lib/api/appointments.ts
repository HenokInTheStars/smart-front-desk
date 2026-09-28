const getBaseUrl = () => process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function getAppointments(token: string, hostId?: string) {
    let url = `${getBaseUrl()}/appointments`;
    if (hostId) {
        url += `?host_id=${hostId}`;
    }
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to load appointments');
    const result = await response.json();
    return result.data !== undefined ? result.data : result;
}
