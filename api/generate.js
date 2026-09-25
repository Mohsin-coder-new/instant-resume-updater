export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {
        const { resume, jd } = req.body || {};

        if (!resume || !jd) {
            return res.status(400).json({
                error: "Resume and job description are required."
            });
        }

        const prompt = `
You are an expert US resume writer and ATS optimization specialist.

Your task is to tailor the candidate's existing resume to the target job description.

IMPORTANT RULES:
- Do NOT invent employers, companies, dates, degrees, certifications, projects, or technologies.
- Do NOT create fake experience.
- Preserve the candidate's actual information.
- Naturally incorporate relevant keywords from the job description when supported by the existing resume.
- Improve the professional summary to match the target role.
- Rewrite experience bullets using an Impact + Action + Outcome style.
- Prioritize the most relevant technical skills.
- Remove unnecessary repetition.
- Keep the resume professional, realistic, concise, and ATS-friendly.
- Use strong action verbs.
- Do not write a cover letter.
- Do not provide explanations before or after the resume.
- Return ONLY the final updated resume.

Preserve these sections when applicable:
SUMMARY
TECHNICAL SKILLS
PROFESSIONAL EXPERIENCE
EDUCATION
CERTIFICATIONS

CURRENT RESUME:
${resume}

TARGET JOB DESCRIPTION:
${jd}
`;

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": process.env.GEMINI_API_KEY
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.35,
                        maxOutputTokens: 12000,
                        topP: 0.9
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API error:", data);

            return res.status(response.status).json({
                error:
                    data?.error?.message ||
                    "Gemini API request failed."
            });
        }

        const text =
            data?.candidates?.[0]?.content?.parts
                ?.map(part => part?.text || "")
                .join("")
                .trim();

        if (!text) {
            return res.status(500).json({
                error: "Gemini returned an empty response."
            });
        }

        return res.status(200).json({
            text
        });

    } catch (error) {

        console.error("Server error:", error);

        return res.status(500).json({
            error: "Something went wrong while generating the resume."
        });
    }
}
