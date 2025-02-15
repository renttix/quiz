interface QuestionImport {
  category: string;
  question: string;
  options: string[];
  correctAnswer: string;
}

export const validateQuestionData = (data: any): data is QuestionImport => {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.category === 'string' &&
    ['80s Music', '90s Music', 'Geography', 'Sport', 'TV & Film'].includes(data.category) &&
    typeof data.question === 'string' &&
    Array.isArray(data.options) &&
    data.options.length === 4 &&
    data.options.every((opt: any) => typeof opt === 'string') &&
    typeof data.correctAnswer === 'string' &&
    data.options.includes(data.correctAnswer)
  );
};

export const parseCSV = (csvContent: string): QuestionImport[] => {
  const lines = csvContent.split('\n');
  const questions: QuestionImport[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by comma, but preserve commas within quotes
    const matches = line.match(/(?:^|,)("(?:[^"]*(?:""[^"]*)*)"|\([^)]*\)|[^,]*)/g);
    if (!matches) continue;

    const fields = matches.map(field => 
      field.startsWith(',') ? field.slice(1) : field
    ).map(field => 
      field.startsWith('"') && field.endsWith('"') 
        ? field.slice(1, -1).replace(/""/g, '"') 
        : field
    );

    if (fields.length >= 6) {
      const [category, question, ...options] = fields;
      const correctAnswer = options.pop() || '';
      
      const questionData = {
        category,
        question,
        options: options.slice(0, 4),
        correctAnswer,
      };

      if (validateQuestionData(questionData)) {
        questions.push(questionData);
      }
    }
  }

  return questions;
};

export const parseJSON = (jsonContent: string): QuestionImport[] => {
  try {
    const parsed = JSON.parse(jsonContent);
    const questions: QuestionImport[] = [];

    if (Array.isArray(parsed)) {
      parsed.forEach(item => {
        if (validateQuestionData(item)) {
          questions.push(item);
        }
      });
    }

    return questions;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return [];
  }
};

export const exportToCSV = (questions: QuestionImport[]): string => {
  const headers = ['Category', 'Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Answer'];
  const rows = questions.map(q => [
    q.category,
    q.question,
    ...q.options,
    q.correctAnswer,
  ].map(field => 
    // Escape fields that contain commas or quotes
    /[,"]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field
  ));

  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

export const exportToJSON = (questions: QuestionImport[]): string => {
  return JSON.stringify(questions, null, 2);
};
