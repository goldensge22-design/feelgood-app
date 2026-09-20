import React,{type ReactNode,type HTMLAttributes,type ButtonHTMLAttributes} from 'react';
import '../../app/app.css';
import './history-ui.css';

// Presentation only. The 706bc03 app-shell, brand, history-panel, history-scene,
// history-pair and prediction-timeline classes remain the shared visual source.
type Box=HTMLAttributes<HTMLDivElement>;
export function HistoryShell({className='',...props}:Box){return <div {...props} className={'app-shell history-shell '+className}/>;}
export function HistoryHeader({brand,wordmark,children}:{brand:ReactNode;wordmark:ReactNode;children?:ReactNode}){return <header className="brand history-header"><strong>{brand}</strong><small>{wordmark}</small>{children}</header>;}
export function HistoryPanel({className='',...props}:Box){return <div {...props} className={'history-panel '+className}/>;}
export function SceneFrame({src,alt,caption,children,className='',style}:{src:string;alt:string;caption?:ReactNode;children?:ReactNode;className?:string;style?:React.CSSProperties}){return <div className={'history-scene scene-frame '+className} style={style} data-play-visual><img src={src} alt={alt}/>{children}{caption&&<div className="scene-caption">{caption}</div>}</div>;}
type Button=ButtonHTMLAttributes<HTMLButtonElement>;
export function PrimaryButton({className='',...props}:Button){return <button type="button" {...props} className={'primary history-button '+className}/>;}
export function SecondaryButton({className='',...props}:Button){return <button type="button" {...props} className={'history-button '+className}/>;}
export function ChoiceCard({className='',...props}:Button){return <SecondaryButton {...props} className={'history-choice '+className}/>;}
export function ActionCard(props:Button){return <ChoiceCard {...props}/>;}
export function StatusBadge({children,tone='pending'}:{children:ReactNode;tone?:'ready'|'pending'}){return <span className={'history-status '+tone}>{children}</span>;}
export function HelpPanel({summary,children}:{summary:string;children:ReactNode}){return <details className="history-help"><summary>{summary}</summary><HistoryPanel>{children}</HistoryPanel></details>;}
export function ProgressIndicator({current,total,label}:{current:number;total:number;label:string}){return <div className="history-progress"><span>{label}</span><progress aria-label={label} value={current} max={total}/></div>;}
export function StoryPage({children,className='',...props}:React.HTMLAttributes<HTMLElement>){return <article {...props} className={'book-page current shared-story-page '+className}>{children}</article>;}
export function HistoryComparisonSpread({actual,story,className='',...props}:Box&{actual:ReactNode;story:ReactNode}){return <div {...props} className={'history-pair comparison-spread '+className}><section data-role="actual-history">{actual}</section><span className="comparison-arrow" aria-hidden="true">↔</span><section data-role="learner-story">{story}</section></div>;}
export function PredictionComparisonTimeline({prediction,actual,className='',...props}:Box&{prediction:ReactNode;actual:ReactNode}){return <div {...props} className={'prediction-timeline comparison-flow '+className}><section className="timeline-step" data-role="initial-prediction">{prediction}</section><section className="timeline-step" data-role="actual-keypoint">{actual}</section></div>;}
