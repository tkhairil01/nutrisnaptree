import axios from 'axios';

// Gemini API configuration
const API_KEY = 'AIzaSyBL3-L3r--LL39pJe0Hiixn1KhjF8aI5qQ';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
const API_URL_VISION = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';

// Function to analyze food image
export const analyzeFoodImage = async (base64Image: string, foodName: string, language: string = 'id') => {
  try {
    // Prepare the prompt based on language
    const prompt = language === 'id' 
      ? `Analisis gambar makanan ini (${foodName}). Berikan informasi berikut dalam format JSON:\n
      {\n
        "foodType": "jenis makanan",\n
        "estimatedWeight": "berat perkiraan dalam gram",\n
        "calories": "jumlah kalori",\n
        "protein": "jumlah protein dalam gram",\n
        "fat": "jumlah lemak dalam gram",\n
        "carbs": "jumlah karbohidrat dalam gram",\n
        "fiber": "jumlah serat dalam gram",\n
        "mealType": "berdasarkan jenis makanan dan waktu makan (Sarapan, Makan Siang, Makan Malam, Camilan, Minuman)"\n
      }`
      : `Analyze this food image (${foodName}). Provide the following information in JSON format:\n
      {\n
        "foodType": "type of food",\n
        "estimatedWeight": "estimated weight in grams",\n
        "calories": "calorie count",\n
        "protein": "protein amount in grams",\n
        "fat": "fat amount in grams",\n
        "carbs": "carbohydrate amount in grams",\n
        "fiber": "fiber amount in grams",\n
        "mealType": "based on food type and meal time (Breakfast, Lunch, Dinner, Snack, Drink)"\n
      }`;

    // Prepare the request payload
    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 4096,
      }
    };

    // Make the API request
    const response = await axios.post(
      `${API_URL_VISION}?key=${API_KEY}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract the JSON from the response
    const responseText = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/); // Extract JSON object from response
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse JSON response from Gemini');
    }
  } catch (error) {
    console.error('Error analyzing food image:', error);
    throw error;
  }
};

// Function to get food recommendations based on user data
export const getFoodRecommendations = async (userData: any, language: string = 'id') => {
  try {
    // Prepare the prompt based on language
    const prompt = language === 'id'
      ? `Berdasarkan data pengguna berikut, berikan 3 rekomendasi makanan sehat yang sesuai dengan target kalori dan preferensi pengguna. Berikan dalam format JSON.\n\nData Pengguna: ${JSON.stringify(userData)}`
      : `Based on the following user data, provide 3 healthy food recommendations that align with the user's calorie target and preferences. Provide in JSON format.\n\nUser Data: ${JSON.stringify(userData)}`;

    // Prepare the request payload
    const payload = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      }
    };

    // Make the API request
    const response = await axios.post(
      `${API_URL}?key=${API_KEY}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract the JSON from the response
    const responseText = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/); // Extract JSON object from response
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse JSON response from Gemini');
    }
  } catch (error) {
    console.error('Error getting food recommendations:', error);
    throw error;
  }
};

// Function to get exercise recommendations based on user data
export const getExerciseRecommendations = async (userData: any, language: string = 'id') => {
  try {
    // Prepare the prompt based on language
    const prompt = language === 'id'
      ? `Berdasarkan data pengguna berikut, berikan 3 rekomendasi latihan yang sesuai dengan tingkat aktivitas dan preferensi pengguna. Berikan dalam format JSON.\n\nData Pengguna: ${JSON.stringify(userData)}`
      : `Based on the following user data, provide 3 exercise recommendations that align with the user's activity level and preferences. Provide in JSON format.\n\nUser Data: ${JSON.stringify(userData)}`;

    // Prepare the request payload
    const payload = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      }
    };

    // Make the API request
    const response = await axios.post(
      `${API_URL}?key=${API_KEY}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract the JSON from the response
    const responseText = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/); // Extract JSON object from response
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse JSON response from Gemini');
    }
  } catch (error) {
    console.error('Error getting exercise recommendations:', error);
    throw error;
  }
};

// Function to get health tips
export const getHealthTips = async (language: string = 'id') => {
  try {
    // Prepare the prompt based on language
    const prompt = language === 'id'
      ? 'Berikan tips kesehatan harian yang singkat dan bermanfaat dalam format JSON dengan struktur {"tip": "isi tip", "category": "kategori tip"}'
      : 'Provide a short and useful daily health tip in JSON format with structure {"tip": "tip content", "category": "tip category"}';

    // Prepare the request payload
    const payload = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.8,
        topK: 32,
        topP: 1,
        maxOutputTokens: 1024,
      }
    };

    // Make the API request
    const response = await axios.post(
      `${API_URL}?key=${API_KEY}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract the JSON from the response
    const responseText = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/); // Extract JSON object from response
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse JSON response from Gemini');
    }
  } catch (error) {
    console.error('Error getting health tips:', error);
    throw error;
  }
};