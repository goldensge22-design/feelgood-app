/** Small matte paper objects: a light top, solid front and narrow solid side. */
export default function Glyph({kind='paper'}:{kind?:'paper'|'book'|'flag'|'block'}){
 return <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="nx-glyph">
  {kind==='block'?<><path d="m5 9 18-3 5 4-18 3z" fill="#e7dbfb"/><path d="M5 9v16h18V9z" fill="#7751b1"/><path d="m23 9 5 1v16l-5-1z" fill="#473270"/></>:
   kind==='flag'?<><path d="M7 3h3v26H7z" fill="#193552"/><path d="m10 5 15-2 3 3-15 2z" fill="#ffe0bb"/><path d="M10 5h15v12H10z" fill="#e78129"/><path d="m25 5 3 1v12l-3-1z" fill="#9d4e18"/></>:
   kind==='book'?<><path d="m3 6 10-2 3 3 3-3 10 2-3 3-10 1L6 9z" fill="#e7f5ff"/><path d="M3 6h10l3 3 3-3h8v19h-8l-3 3-3-3H3z" fill="#4b8fcc"/><path d="m27 6 3 2v19h-3z" fill="#214e7b"/><path d="M7 11h5m8 0h3M7 16h5m8 0h3m-7-5v13" stroke="#fffbed" strokeWidth="2"/></>:
   <><path d="m6 4 17-2 4 4-17 2z" fill="#d9f1fb"/><path d="M6 4h17v23H6z" fill="#fffdf4" stroke="#436185"/><path d="m23 4 4 2v23l-4-2z" fill="#7da8c1"/><path d="M10 11h9m-9 5h9m-9 5h6" stroke="#376ba6" strokeWidth="2"/></>}
 </svg>;
}
