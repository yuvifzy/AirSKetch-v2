// No-Fly Zones for the AirSketch grid
// Each zone is a polygon defined by grid coordinates

export interface NFZone {
    id: string;
    label: string;
    color: string;
    gridPolygon: number[][];
}

export const NFZ_ZONES: NFZone[] = [
    {
        id: 'nfz-01',
        label: 'HAL Airport',
        color: '#ef4444',
        gridPolygon: [
            [2, 3],
            [5, 3],
            [5, 8],
            [2, 8],
            [2, 3], // Close polygon
        ],
    },
    {
        id: 'nfz-02',
        label: 'Raj Bhavan',
        color: '#ef4444',
        gridPolygon: [
            [10, 2],
            [13, 2],
            [13, 5],
            [10, 5],
            [10, 2], // Close polygon
        ],
    },
    {
        id: 'nfz-03',
        label: 'ISRO Campus',
        color: '#ef4444',
        gridPolygon: [
            [15, 12],
            [18, 12],
            [18, 16],
            [15, 16],
            [15, 12], // Close polygon
        ],
    },
];
