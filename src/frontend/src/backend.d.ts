import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type Time = bigint;
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface UserProfile {
    username?: string;
    joinDate: Time;
    userId: string;
    coins: bigint;
    mobileNumber: string;
    favoriteTeam?: string;
    level: bigint;
    avatar: string;
}
export interface http_header {
    value: string;
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCoins(userPrincipal: Principal, amount: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createUser(mobileNumber: string): Promise<{
        joinDate: Time;
        userId: string;
        coins: bigint;
        level: bigint;
    }>;
    fetchCricketMatches(): Promise<string>;
    findUserByMobileNumber(mobileNumber: string): Promise<Principal>;
    getAllUsers(): Promise<Array<UserProfile>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getUser(userPrincipal: Principal): Promise<UserProfile>;
    getUserCoins(userPrincipal: Principal): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isProfileComplete(userPrincipal: Principal): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateUserProfile(userPrincipal: Principal, username: string | null, favoriteTeam: string | null, avatar: string): Promise<void>;
}
