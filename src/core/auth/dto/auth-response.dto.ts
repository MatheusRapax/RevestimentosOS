export class AuthResponseDto {
    access_token: string;
    user: {
        id: string;
        email: string;
        name: string | null;
        isActive: boolean;
    };
    clinics: {
        id: string;
        name: string;
        slug: string;
    }[];
}
