export interface IVehicle {
    id?: string;
    driverId: string;
    name: string; // Combined make + model (e.g., "Maruti Suzuki Swift (VXI)")
    year: number;
    plateNumber: string;
    seats: number; // Number of seats
    category: 'motorbike' | 'sedan' | 'suv' | 'xl' | 'first_class';
    images: {
        front: string;
        back: string;
    };
    documents: {
        insurance: string;
        registration: string;
        inspection?: string;
    };
    isApproved: boolean;
    createdAt: Date;
    updatedAt: Date;
}
