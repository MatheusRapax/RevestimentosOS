export class AuthResponseDto {
    access_token: string;
    user: {
        id: string;
        email: string;
        name: string | null;
        isActive: boolean;
        isSuperAdmin?: boolean;
    };
    clinics: {
        id: string;
        name: string;
        slug: string;
    }[];
}
