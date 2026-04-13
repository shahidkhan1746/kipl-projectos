import { BaseEntity } from '../shared/entities/base.entity';
export declare enum MeetingType {
    SITE_PROGRESS = "site_progress",
    COORDINATION = "coordination",
    SAFETY = "safety",
    DESIGN_REVIEW = "design_review",
    QUALITY = "quality",
    CLIENT_UEED = "client_ueed",
    LCMA = "lcma",
    INTERNAL = "internal"
}
export declare enum MeetingStatus {
    DRAFT = "draft",
    CIRCULATED = "circulated",
    CONFIRMED = "confirmed"
}
export declare class Meeting extends BaseEntity {
    projectId: string;
    meetingNo: string;
    type: MeetingType;
    title: string;
    date: string;
    time: string;
    venue: string;
    chairedBy: string;
    minutedBy: string;
    attendees: any[];
    agendaItems: any[];
    actionItems: any[];
    prevMeetingId: string;
    prevActionsReviewed: boolean;
    nextMeetingDate: string;
    nextMeetingVenue: string;
    remarks: string;
    status: MeetingStatus;
}
