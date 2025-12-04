export interface IVehicle {
    id?: string;
    driverId: string;
    make: string;
    model: string;
    year: number;
    color: string;
    plateNumber: string;
    category: 'motorbike' | 'sedan' | 'suv' | 'xl' | 'first_class';
    documents: {
        insurance: string;
        registration: string;
        inspection?: string;
    };
    isApproved: boolean;
    createdAt: Date;
    updatedAt: Date;
}
