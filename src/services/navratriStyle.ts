// Navratri is celebrated differently across India, so the Navratri theme picks
// a regional style from the user's state:
//   garba      Gujarat, Maharashtra, Goa: nine nights of Garba and Dandiya
//   durga_puja Bengal, Assam, Odisha, Bihar and the east: Durga Puja
//   golu       the South: Golu / Bommai Golu (stepped doll displays), Mysuru Dasara
//   ramlila    the North and Centre: Ramlila, ending with Dussehra
// An unknown or missing region falls back to garba, the most widely recognised.

export type NavratriStyle = 'garba' | 'durga_puja' | 'golu' | 'ramlila';

const REGIONS: Record<Exclude<NavratriStyle, 'garba'>, string[]> = {
    durga_puja: [
        'west bengal', 'assam', 'odisha', 'orissa', 'tripura', 'bihar', 'jharkhand', 'meghalaya',
    ],
    golu: [
        'tamil nadu', 'kerala', 'karnataka', 'andhra pradesh', 'telangana', 'puducherry', 'pondicherry',
    ],
    ramlila: [
        'uttar pradesh', 'delhi', 'haryana', 'punjab', 'himachal pradesh', 'uttarakhand', 'rajasthan',
        'madhya pradesh', 'chhattisgarh', 'jammu and kashmir', 'chandigarh', 'ladakh',
    ],
};

export const getNavratriStyle = (region?: string | null): NavratriStyle => {
    if (!region) return 'garba';
    const r = region.toLowerCase();
    for (const [style, states] of Object.entries(REGIONS)) {
        if (states.some((s) => r.includes(s))) return style as NavratriStyle;
    }
    return 'garba';
};

/**
 * Returns the user's preferred region from local storage without external network requests.
 * Resolves to null when unset, falling back to the default 'garba' style.
 */
export const getUserRegion = async (): Promise<string | null> => {
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const stored = window.localStorage.getItem('notenirman_navratri_region') ||
                           window.localStorage.getItem('notenirman_user_region');
            if (stored) return stored;
        } catch {
            // Ignore storage errors
        }
    }
    return null;
};
