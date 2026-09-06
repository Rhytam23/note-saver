import { supabase } from './supabase';

export interface CalendarEvent {
    summary: string;
    start: {
        dateTime?: string;
        date?: string;
    };
}

export const fetchTodayEvents = async (): Promise<string[]> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session || !session.provider_token) {
            console.info('[CalendarService] No active session or provider token found.');
            return [];
        }

        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString();

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfDay}&timeMax=${endOfDay}&singleEvents=true`,
            {
                headers: {
                    Authorization: `Bearer ${session.provider_token}`,
                },
            }
        );

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.warn('[CalendarService] Auth error. Token might be expired or scope missing.');
            }
            return [];
        }

        const data = await response.json();
        const events: CalendarEvent[] = data.items || [];
        
        return events.map(event => event.summary);
    } catch (error) {
        console.error('[CalendarService] Failed to fetch events:', error);
        return [];
    }
};
