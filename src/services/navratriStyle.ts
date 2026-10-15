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

const regionServices: { url: string; read: (d: any) => string | undefined }[] = [
    { url: 'https://ipwho.is/', read: (d) => (d.success ? d.region : undefined) },
    { url: 'https://get.geojs.io/v1/ip/geo.json', read: (d) => d.region },
    { url: 'https://ipapi.co/json/', read: (d) => (d.error ? undefined : d.region) },
];

/** Looks up the user's state/region by IP. Resolves to null when offline or unavailable. */
export const getUserRegion = async (): Promise<string | null> => {
    for (const service of regionServices) {
        try {
            const response = await fetch(service.url, { headers: { Accept: 'application/json' } });
            if (!response.ok) continue;
            const region = service.read(await response.json());
            if (region) return region;
        } catch {
            // This service failed; try the next one.
        }
    }
    return null;
};
