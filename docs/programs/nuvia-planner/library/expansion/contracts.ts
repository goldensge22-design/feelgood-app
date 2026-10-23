import type {Locale,SharedTemplate} from '../contracts';
/** Source IDs normalized to strings. Never overwrite the report payload or its ranking. */
export type CatalogSourceRef = {id:string;version:string};
export type LibraryBinding = {
 id:string;version:string;population:'adult'|'teen';sourceRef:CatalogSourceRef;
 status:'draft'|'reviewed'|'retired';reviewedBy:string|null;reviewedAt:string|null;
 domainReviewRequired:true;domainReviewedBy:string|null;domainReviewedAt:string|null;
 templateIds:[string,string,string];dailyTemplateIds:[string,string,string];
 mappingBasis:string;familyId?:string;
};
export type LookupRequest = {
 population:'adult'|'teen';sourceId:string;sourceVersion:string;
 locale:Locale;audience:'middle'|'high'|'university-adult';
};
export type LookupResult = {
 status:'available'|'unavailable';cards:SharedTemplate[];dailyCards:SharedTemplate[];
 nextAction:'choose-one'|'offer-private-authoring';aiRequested:false;
};
/** Request authoring privately first. Shared publication is never implied by saving. */
export type CandidatePublicationRequest = {
 privateTemplateRef:{id:string;version:string};
 explicitConsentRef:string;redactionReviewRef:string;rightsReviewRef:string;
 status:'pending-editorial-review';
};
