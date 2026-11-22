import type {ScenarioFamily,ScenarioLanguage} from "./scenario-model";
export const scenarioOccupationIds=["aviation-security-screening","aviation-security-guard","industrial-security","air-traffic-planning","flight-operations","air-cargo-logistics","cabin-crew","passenger-service","office-administration","airport-operations"] as const;
export type ScenarioOccupationId=typeof scenarioOccupationIds[number];
export function scenarioOccupationFamily(id:string):ScenarioFamily|undefined{
 return (scenarioOccupationIds as readonly string[]).includes(id)?id==="air-cargo-logistics"?"logistics":id==="office-administration"?"administration":"aviation":undefined;
}
// Role labels are translated; underlying material data, references and meaning stay common.
const names:Record<ScenarioLanguage,string>={
 ko:"항공보안 검색|항공보안 경비|산업보안|항공교통|운항관리|항공화물 물류|객실승무|여객서비스|사무행정|공항운영",
 en:"Aviation security screening|Aviation security guarding|Industrial security|Air traffic|Flight operations|Air cargo logistics|Cabin crew|Passenger service|Office administration|Airport operations",
 ja:"航空保安検査|航空保安警備|産業保安|航空交通|運航管理|航空貨物物流|客室乗務|旅客サービス|事務行政|空港運営",
 "zh-CN":"航空安检|航空安保|工业安全|空中交通|航班运行管理|航空货运物流|客舱乘务|旅客服务|办公行政|机场运营",
 "zh-TW":"航空安檢|航空保安|產業保安|航空交通|航班運行管理|航空貨運物流|客艙服務|旅客服務|辦公行政|機場營運",
 mn:"Нисэхийн аюулгүй байдлын шалгалт|Нисэхийн хамгаалалт|Үйлдвэрлэлийн хамгаалалт|Агаарын хөдөлгөөн|Нислэгийн ажиллагаа|Агаарын ачааны логистик|Бүхээгийн үйлчилгээ|Зорчигчийн үйлчилгээ|Албан хэрэг|Нисэх буудлын ажиллагаа",
 th:"ตรวจค้นความปลอดภัยการบิน|รักษาความปลอดภัยการบิน|ความปลอดภัยอุตสาหกรรม|จราจรทางอากาศ|การปฏิบัติการบิน|โลจิสติกส์สินค้าทางอากาศ|ลูกเรือห้องโดยสาร|บริการผู้โดยสาร|งานธุรการ|การดำเนินงานสนามบิน",
 vi:"Soi chiếu an ninh hàng không|Bảo vệ an ninh hàng không|An ninh công nghiệp|Giao thông hàng không|Điều hành bay|Logistics hàng hóa hàng không|Tiếp viên hàng không|Dịch vụ hành khách|Hành chính văn phòng|Vận hành sân bay",
 ar:"التفتيش الأمني للطيران|حراسة أمن الطيران|الأمن الصناعي|الحركة الجوية|عمليات الطيران|لوجستيات الشحن الجوي|طاقم المقصورة|خدمة الركاب|الإدارة المكتبية|تشغيل المطارات",
 ru:"Авиационный досмотр|Охрана авиационной безопасности|Промышленная безопасность|Воздушное движение|Управление полётами|Авиагрузовая логистика|Бортпроводник|Обслуживание пассажиров|Делопроизводство|Эксплуатация аэропорта",
 km:"ត្រួតពិនិត្យសន្តិសុខអាកាសចរណ៍|ការពារសន្តិសុខអាកាសចរណ៍|សន្តិសុខឧស្សាហកម្ម|ចរាចរណ៍ផ្លូវអាកាស|ប្រតិបត្តិការហោះហើរ|ភស្តុភារទំនិញអាកាស|បុគ្គលិកកាប៊ីន|សេវាអ្នកដំណើរ|រដ្ឋបាលការិយាល័យ|ប្រតិបត្តិការអាកាសយានដ្ឋាន",
 es:"Control de seguridad aérea|Vigilancia aérea|Seguridad industrial|Tráfico aéreo|Operaciones de vuelo|Logística de carga aérea|Tripulación de cabina|Servicio al pasajero|Administración de oficina|Operaciones aeroportuarias",
 fr:"Inspection de sûreté aérienne|Gardiennage aérien|Sécurité industrielle|Trafic aérien|Opérations aériennes|Logistique du fret aérien|Personnel de cabine|Service passagers|Administration de bureau|Exploitation aéroportuaire",
 it:"Controllo di sicurezza aerea|Vigilanza aeroportuale|Sicurezza industriale|Traffico aereo|Operazioni di volo|Logistica merci aeree|Personale di cabina|Servizi passeggeri|Amministrazione d’ufficio|Operazioni aeroportuali",
 az:"Aviasiya təhlükəsizlik yoxlaması|Aviasiya mühafizəsi|Sənaye təhlükəsizliyi|Hava hərəkəti|Uçuş əməliyyatları|Hava yükü logistikası|Kabin heyəti|Sərnişin xidməti|Ofis inzibatçılığı|Hava limanı əməliyyatları",
};
export const scenarioOccupationName=(l:ScenarioLanguage,id:ScenarioOccupationId)=>names[l].split("|")[scenarioOccupationIds.indexOf(id)];
type Definition={subject:string;artifact:string;a:Record<string,string>;b:Record<string,string>;updates:[Record<string,string>,Record<string,string>]};
// These are everyday fictional checking/coordination exercises, NOT operational aviation procedures.
export const occupationCases:Record<ScenarioOccupationId,Definition>={
 "aviation-security-screening":{subject:"publicRevision",artifact:"holdQuestions",a:{publicRevision:"1",references:"2",permission:"0"},b:{publicRevision:"2",references:"3",permission:"0"},updates:[{publicRevision:"3",references:"2",permission:"0"},{permission:"1",publicRevision:"2",references:"3"}]},
 "aviation-security-guard":{subject:"entryPermission",artifact:"authorizationLog",a:{entryPermission:"0",visitors:"4",contact:"A"},b:{entryPermission:"1",visitors:"3",contact:"B"},updates:[{entryPermission:"0",visitors:"5",contact:"B"},{entryPermission:"1",visitors:"4",contact:"A"}]},
 "industrial-security":{subject:"sharingScope",artifact:"scopeQuestions",a:{sharingScope:"PUBLIC",fileVersion:"1",permission:"0"},b:{sharingScope:"TEAM",fileVersion:"2",permission:"0"},updates:[{sharingScope:"TEAM",permission:"0",fileVersion:"3"},{sharingScope:"PUBLIC",permission:"1",fileVersion:"2"}]},
 "air-traffic-planning":{subject:"timeSlot",artifact:"sequenceLog",a:{timeSlot:"14:00–14:10",order:"A → B",handover:"0"},b:{timeSlot:"14:05–14:15",order:"B → A",handover:"0"},updates:[{timeSlot:"14:10–14:20",order:"A → B",handover:"0"},{handover:"1",timeSlot:"14:05–14:15",order:"B → A"}]},
 "flight-operations":{subject:"planVersion",artifact:"revisionChecklist",a:{planVersion:"1",cutoff:"15:00",ownerConfirmed:"0"},b:{planVersion:"2",cutoff:"14:30",ownerConfirmed:"0"},updates:[{planVersion:"3",cutoff:"14:15",ownerConfirmed:"0"},{planVersion:"2",cutoff:"14:30",ownerConfirmed:"1"}]},
 "air-cargo-logistics":{subject:"quantity",artifact:"quantityHandover",a:{quantity:"40",required:"36",cutoff:"11:00"},b:{quantity:"34",required:"36",cutoff:"11:00"},updates:[{quantity:"34",required:"36",cutoff:"10:30"},{quantity:"36",required:"36",cutoff:"11:00"}]},
 "cabin-crew":{subject:"helpRequests",artifact:"supportLog",a:{helpRequests:"2",availableHelpers:"1",requestOrder:"A → B"},b:{helpRequests:"4",availableHelpers:"1",requestOrder:"B → A"},updates:[{helpRequests:"5",availableHelpers:"1",requestOrder:"B → A"},{helpRequests:"4",availableHelpers:"2",requestOrder:"A → B"}]},
 "passenger-service":{subject:"routeInformation",artifact:"informationLog",a:{routeInformation:"A → B",publicRevision:"1",helpRequests:"2"},b:{routeInformation:"A → C",publicRevision:"2",helpRequests:"2"},updates:[{routeInformation:"A → D",publicRevision:"3",helpRequests:"3"},{routeInformation:"A → C",publicRevision:"2",helpRequests:"1"}]},
 "office-administration":{subject:"amount",artifact:"approvalChangeLog",a:{amount:"48000",approvalVersion:"1",permission:"1"},b:{amount:"60000",approvalVersion:"2",permission:"0"},updates:[{amount:"64000",approvalVersion:"3",permission:"0"},{amount:"60000",approvalVersion:"2",permission:"1"}]},
 "airport-operations":{subject:"facilityAvailability",artifact:"facilityHandover",a:{facilityAvailability:"A:1 / B:1",helpRequests:"2",handover:"0"},b:{facilityAvailability:"A:0 / B:1",helpRequests:"3",handover:"0"},updates:[{facilityAvailability:"A:0 / B:0",helpRequests:"4",handover:"0"},{facilityAvailability:"A:0 / B:1",helpRequests:"2",handover:"1"}]},
};
