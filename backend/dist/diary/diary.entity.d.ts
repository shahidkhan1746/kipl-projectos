import { BaseEntity } from '../shared/entities/base.entity';
export declare enum WeatherCondition {
    SUNNY = "sunny",
    CLOUDY = "cloudy",
    RAINY = "rainy",
    FOGGY = "foggy",
    SNOWY = "snowy",
    STORMY = "stormy"
}
export declare enum DiaryStatus {
    DRAFT = "draft",
    SUBMITTED = "submitted",
    APPROVED = "approved"
}
export declare class SiteDiary extends BaseEntity {
    projectId: string;
    date: string;
    submittedBy: string;
    weatherMorning: WeatherCondition;
    weatherAfternoon: WeatherCondition;
    tempMin: number;
    tempMax: number;
    rainfallMm: number;
    workStoppedWeather: boolean;
    hoursLost: number;
    labourSkilled: number;
    labourUnskilled: number;
    labourSupervisory: number;
    labourTotal: number;
    equipment: any[];
    workDone: any[];
    materialsReceived: any[];
    visitors: any[];
    issuesFaced: string;
    instructionsGiven: string;
    nextDayPlan: string;
    photos: any[];
    eotClaim: boolean;
    eotReason: string;
    status: DiaryStatus;
    approvedBy: string;
}
