export const fetchCities = async (token: string): Promise<string[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/surveys/cities`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch cities');
  }

  const data = await response.json();
  return data.cities;
};
