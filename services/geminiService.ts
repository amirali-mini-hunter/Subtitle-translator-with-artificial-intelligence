/**
 * Translates a batch of texts by sending them to our secure Gemini API on the server.
 *
 * @param texts - An array of strings to be translated.
 * @param targetLanguageCode - The language code for the target language (e.g., 'fa').
 * @param targetLanguageName - The full name of the target language (e.g., 'Persian').
 * @param temperature - A value for translation creativity.
 * @param systemInstruction - A custom prompt or instruction string.
 * @param model - Selected Gemini model (e.g., 'gemini-3.5-flash').
 * @returns A promise that resolves to an array of translated strings.
 */
export const translateTextBatch = async (
  texts: string[],
  targetLanguageCode: string,
  targetLanguageName: string,
  temperature: number = 0.5,
  systemInstruction: string | undefined,
  model: string = 'gemini-3.5-flash'
): Promise<string[]> => {
  if (!texts || texts.length === 0) {
    return [];
  }

  const payload = {
    texts,
    targetLanguageCode,
    targetLanguageName,
    temperature,
    systemInstruction,
    model,
  };

  try {
    const response = await fetch("/api/translate", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.details || errorData.error || `Server responded with ${response.status}`;
      console.error("Gemini server-side translation endpoint error:", errorMessage);
      throw new Error(errorMessage);
    }

    const responseData = await response.json();

    if (!responseData || !Array.isArray(responseData.translatedTexts)) {
      console.error("Invalid format from Gemini api endpoint. Expected { translatedTexts: [...] }", responseData);
      throw new Error("INVALID_GEMINI_RESPONSE");
    }

    const translatedTexts: string[] = responseData.translatedTexts;
    const result = new Array(texts.length).fill('');
    for (let i = 0; i < texts.length; i++) {
      result[i] = translatedTexts[i] !== undefined ? translatedTexts[i] : texts[i];
    }

    return result;
  } catch (error: any) {
    console.error("Error calling Gemini Server API:", error);
    throw error;
  }
};
