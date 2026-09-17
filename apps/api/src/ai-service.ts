import OpenAI from 'openai';
import { findPatient, getCancellationPolicy, getDoctorSchedule } from './ai-tools.js';

const tools = [
  { type: 'function' as const, name: 'findPatient', description: 'Find patients by name.', strict: true, parameters: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'], additionalProperties: false } },
  { type: 'function' as const, name: 'getDoctorSchedule', description: 'Read a doctor schedule for a date.', strict: true, parameters: { type: 'object', properties: { doctorName: { type: 'string' }, date: { type: 'string' } }, required: ['doctorName', 'date'], additionalProperties: false } },
  { type: 'function' as const, name: 'getCancellationPolicy', description: 'Read the current cancellation policy.', strict: true, parameters: { type: 'object', properties: {}, additionalProperties: false } }
];

export async function runOpenAiAssistant(message: string) {
  if (!process.env.OPENAI_API_KEY) return null;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let response: any = await client.responses.create({ model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini', instructions: 'You are MediSlot AI Front Desk. Use tools for facts. Never invent patients, doctors, appointments, or completed actions. Ask for clarification when needed. Read-only tools are available; destructive actions require confirmation.', input: message, tools });
  for (let round = 0; round < 3; round += 1) {
    const calls = response.output.filter((item: any) => item.type === 'function_call');
    if (!calls.length) return response.output_text;
    const outputs = [];
    for (const call of calls) {
      const args = JSON.parse(call.arguments);
      const result = call.name === 'findPatient' ? await findPatient(args) : call.name === 'getDoctorSchedule' ? await getDoctorSchedule(args) : await getCancellationPolicy(args);
      outputs.push({ type: 'function_call_output' as const, call_id: call.call_id, output: JSON.stringify(result) });
    }
    response = await client.responses.create({ model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini', instructions: 'Answer using only the tool results. Keep front-desk responses concise.', previous_response_id: response.id, input: outputs });
  }
  return 'I could not complete that request safely. Please try a more specific question.';
}
