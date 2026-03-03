import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ResumeData {
  content: string;
}

export async function polishResume(rawText: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are a professional resume writer and career coach. 
            Take the following raw text extracted from a document and transform it into a high-impact, professional resume.
            
            Guidelines:
            1. Use a clean, modern, and professional tone.
            2. Use strong action verbs (e.g., "Spearheaded", "Orchestrated", "Optimized").
            3. Focus on achievements and quantifiable results where possible.
            4. Organize the content into clear sections: Contact Information, Professional Summary, Work Experience, Education, Skills, and optionally Projects or Certifications.
            5. Format the output in clean Markdown.
            6. If information is missing (like contact details), use placeholders like [Your Name], [Your Email], etc.
            7. Ensure the layout is scannable and visually appealing when rendered.
            
            Raw Text:
            ${rawText}`
          }
        ]
      }
    ],
    config: {
      temperature: 0.7,
      topP: 0.95,
      topK: 64,
    }
  });

  return response.text || "Failed to generate resume content.";
}

export async function refineResume(currentContent: string, instruction: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are a professional resume writer. I have a resume in Markdown format, and I need you to update it based on my instructions.
            
            Current Resume Content:
            ${currentContent}
            
            User Instruction:
            ${instruction}
            
            Guidelines for the update:
            1. Maintain the professional tone and Markdown structure.
            2. Apply the requested changes while keeping the rest of the content intact and high-quality.
            3. Ensure the final output is only the updated Markdown resume content.`
          }
        ]
      }
    ],
    config: {
      temperature: 0.7,
      topP: 0.95,
      topK: 64,
    }
  });

  return response.text || currentContent;
}
