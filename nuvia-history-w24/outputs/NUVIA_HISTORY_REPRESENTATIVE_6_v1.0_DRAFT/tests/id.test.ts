import test from 'node:test';
import assert from 'node:assert/strict';
import {randomId,type RandomSource} from '../src/core/id';

test('uses native randomUUID when available',()=>{
 const source:RandomSource={randomUUID:()=> 'native-id',getRandomValues:array=>array};
 assert.equal(randomId(source),'native-id');
});

test('creates a version 4 UUID when randomUUID is unavailable',()=>{
 const source:RandomSource={getRandomValues:array=>{const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);bytes.forEach((_,index)=>bytes[index]=index);return array;}};
 const id=randomId(source);
 assert.equal(id,'00010203-0405-4607-8809-0a0b0c0d0e0f');
 assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
