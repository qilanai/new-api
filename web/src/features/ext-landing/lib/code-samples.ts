/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
export type SampleLanguage = 'python' | 'curl' | 'node'

export interface CodeSample {
  value: SampleLanguage
  label: string
  code: string
}

const MODEL = 'gpt-4o'

export function buildCodeSamples(baseUrl: string): CodeSample[] {
  return [
    {
      value: 'python',
      label: 'Python',
      code: `from openai import OpenAI

client = OpenAI(
    base_url="${baseUrl}",
    api_key="sk-your-key",
)

resp = client.chat.completions.create(
    model="${MODEL}",
    messages=[{"role": "user", "content": "Hello"}],
    stream=True,
)
for chunk in resp:
    print(chunk.choices[0].delta.content or "", end="")`,
    },
    {
      value: 'curl',
      label: 'cURL',
      code: `curl ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer sk-your-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${MODEL}",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'`,
    },
    {
      value: 'node',
      label: 'Node.js',
      code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${baseUrl}",
  apiKey: "sk-your-key",
});

const stream = await client.chat.completions.create({
  model: "${MODEL}",
  messages: [{ role: "user", content: "Hello" }],
  stream: true,
});
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}`,
    },
  ]
}

/** The gateway speaks the OpenAI protocol on the same origin as the console. */
export function resolveBaseUrl(): string {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return 'https://api.example.com/v1'
  }
  return `${window.location.origin}/v1`
}
