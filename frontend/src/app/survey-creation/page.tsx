"use client"

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Switch,
  Select,
  Slider,
  Rating,
} from "@mui/material";
import ReactPlayer from "react-player";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { ChromePicker } from "react-color";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { createSurvey } from "../../utils/surveyService";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VisibilityIcon from "@mui/icons-material/Visibility"; // Ajouté pour le bouton Preview



type Question = {
  id: string;
  type: string;
  text: string;
  options?: string[];
  media?: string;
  selectedDate?: Date | null; // Ajout de cette propriété

};

type FormData = {
  title: string;
  description: string;
  demographicEnabled: boolean;
  questions: Question[];
};


const isValidMediaURL = (url: string): boolean => {
  return /\.(mp4|mov|jpg|jpeg|png)$/i.test(url);
};


const questionTypes = [
  { value: "multiple-choice", label: "Multiple Choice" },
  { value: "text", label: "Open-ended" },
  { value: "dropdown", label: "Dropdown" },
  { value: "yes-no", label: "Yes/No" },
  { value: "slider", label: "Slider" },
  { value: "rating", label: "Rating (Stars)" },
  { value: "date", label: "Date Picker" },
  { value: "file-upload", label: "File Upload" },
  { value: "color-picker", label: "Color Picker" },
];



const educationOptions = [
  "High School",
  "Bachelor's",
  "Master's",
  "Doctorate",
  "Other",
];

const SurveyCreationPage: React.FC = () => {
  const { control, handleSubmit, setValue,getValues, reset, watch } = useForm<FormData>({
    defaultValues: {
      title: "",
      description: "",
      demographicEnabled: false,
      questions: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "questions",
  });

  const [localOptions, setLocalOptions] = useState<{ [key: string]: string[] }>({});
  const [showPreview, setShowPreview] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null); 
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const [selectedColors, setSelectedColors] = useState<{ [key: string]: { color: string; alpha: number } }>({});

  const questions = watch("questions"); // Surveille toutes les questions

  const [cities, setCities] = useState<string[]>([]); // Liste des villes
  const [selectedCity, setSelectedCity] = useState(""); // Ville sélectionnée

  const fetchCities = async () => {
    try {
      const response = await fetch(
        "https://countriesnow.space/api/v0.1/countries/cities",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ country: "Israel" }),
        }
      );
      const data = await response.json();

      if (data && data.data) {
        return data.data; // Liste des villes
      } else {
        console.error("Erreur : aucune donnée trouvée.");
        return [];
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des villes :", error);
      return [];
    }
  };

  // Appeler `fetchCities` dans `useEffect`
  useEffect(() => {
    const loadCities = async () => {
      const citiesList = await fetchCities();
      setCities(citiesList); // Met à jour les villes
    };

    loadCities();
  }, []);

 /* const questions: Question[] = [
    {
      id: "1",
      type: "video",
      text: "Test Video",
      media: "https://www.w3schools.com/html/mov_bbb.mp4", // URL de la vidéo
    },
  ];*/

  const demographicEnabled = watch("demographicEnabled");


  useEffect(() => {
    return () => {
      // Nettoyez toutes les URLs Blob lorsqu'elles ne sont plus nécessaires
      fields.forEach((field) => {
        if (field.media?.startsWith("blob:")) {
          URL.revokeObjectURL(field.media);
        }
      });
    };
  }, [fields]);
  
   // useEffect to initialize color-picker questions
   useEffect(() => {
    // Initialize missing color-picker entries
    questions.forEach((question) => {
      if (question.type === "color-picker" && !selectedColors[question.id]) {
        setSelectedColors((prev) => ({
          ...prev,
          [question.id]: { color: "#000000", alpha: 1 },
        }));
      }
    });
  }, [questions]); // Trigger this effect when questions change


  const handleAddQuestion = () => {
    const id = Date.now().toString();
    append({ id, type: "text", text: "", options: [], media: "" ,selectedDate: null });
    setLocalOptions((prev) => ({ ...prev, [id]: [] }));
    setSelectedColors((prev) => ({ ...prev, [id]: { color: "#000000", alpha: 1 } }));
  };

  const handleDeleteQuestion = (index: number) => {
    const questionId = fields[index].id;
    remove(index);
    setLocalOptions((prev) => {
      const updated = { ...prev };
      delete updated[questionId];
      return updated;
    });
  };

  const handleQuestionTypeChange = (index: number, newType: string) => {
    // Récupérer la valeur actuelle du texte via getValues
    const currentText = getValues(`questions.${index}.text`);
    const questionId = fields[index].id;

    // Mettre à jour la question en préservant le texte actuel
    update(index, {
      id: questionId,
      type: newType,
      text: currentText, // Utiliser la valeur actuelle du texte
      options: newType === "multiple-choice" || newType === "dropdown" ? [""] : [],
      media: fields[index].media || "",
      selectedDate: fields[index].selectedDate || null,
    });

    // Mettre à jour les options locales si nécessaire
    if (newType === "multiple-choice" || newType === "dropdown") {
      setLocalOptions((prev) => ({ ...prev, [questionId]: prev[questionId] || [""] }));
    } else {
      setLocalOptions((prev) => {
        const updated = { ...prev };
        delete updated[questionId];
        return updated;
      });
    }
  };

  const handleAddOption = (questionId: string) => {
    setLocalOptions((prev) => ({
      ...prev,
      [questionId]: [...(prev[questionId] || []), ""],
    }));
  };

  const handleOptionChange = (questionId: string, optionIndex: number, value: string) => {
    setLocalOptions((prev) => {
      const updatedOptions = [...(prev[questionId] || [])];
      updatedOptions[optionIndex] = value;
      return { ...prev, [questionId]: updatedOptions };
    });
  };

  const handleResetSurvey = () => {
    reset({
      title: "",
      description: "",
      demographicEnabled: false,
      questions: [],
    });
    setLocalOptions({});
  };

  

  const handleFileUpload = async (file: File, questionId: string): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file);
  
    try {
      const response = await fetch("http://localhost:5041/api/surveys/upload-media", {
        method: "POST",
        body: formData,
      });
  
      const result = await response.json();
      console.log("Upload response:", result);
  
      if (response.ok && result.url) {
        console.log(`Updating media URL for question ${questionId} with URL: ${result.url}`);
        fields.forEach((field, index) => {
          if (field.id === questionId) {
            update(index, { ...field, media: result.url });
          }
        });
        console.log("Questions after update:", getValues("questions"));
      } else {
        console.error("Failed to upload media:", result);
        alert("Failed to upload media. Please try again.");
      }
    } catch (error) {
      console.error("Error uploading media:", error);
      alert("An error occurred while uploading the media.");
    }
  };
  
  const [localQuestions, setLocalQuestions] = useState<Question[]>([]);
  
  useEffect(() => {
    setLocalQuestions(getValues("questions"));
  }, [watch("questions")]);
  
  
  
  
  
  
  
  
  const onSubmit = async (data: FormData) => {
    const questionsWithUpdatedOptions = data.questions.map((question) => ({
      ...question,
      options: localOptions[question.id] || [],
    }));


  
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error("No authentication token found.");
      }
      await createSurvey({ ...data, questions: questionsWithUpdatedOptions }, token);
      alert("Survey submitted successfully!");
    } catch (error) {
      console.error("Error submitting survey:", error);
      alert("Failed to submit survey. Check the console for details.");
    }
  };
  

  const renderDemographicPreview = () => {
    return (
      <Box sx={{ mt: 2, p: 3, border: "1px solid #ddd", borderRadius: "8px", backgroundColor: "#fff" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Demographic Information
        </Typography>
        <RadioGroup sx={{ mb: 2 }}>
          <FormControlLabel value="male" control={<Radio />} label="Male" />
          <FormControlLabel value="female" control={<Radio />} label="Female" />
          <FormControlLabel value="other" control={<Radio />} label="Other" />
        </RadioGroup>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Date of Birth"
            value={dateOfBirth}
            onChange={(newDate) => setDateOfBirth(newDate)}
            renderInput={(params) => <TextField {...params} fullWidth sx={{ mt: 2 }} />}
          />
        </LocalizationProvider>
        <Select fullWidth sx={{ mt: 2 }} displayEmpty defaultValue="">
          <MenuItem value="" disabled>
            Select education level
          </MenuItem>
          {educationOptions.map((level, index) => (
            <MenuItem key={index} value={level}>
              {level}
            </MenuItem>
          ))}
        </Select>
        <Select
  fullWidth
  sx={{ mt: 2 }}
  displayEmpty
  defaultValue=""
  value={selectedCity}
  onChange={(e) => setSelectedCity(e.target.value)} // Mettez à jour l'état de la ville sélectionnée
>
  <MenuItem value="" disabled>
    Select your city
  </MenuItem>
  {cities.map((city, index) => (
    <MenuItem key={index} value={city}>
      {city}
    </MenuItem>
  ))}
</Select>
      </Box>
    );
  };


  const renderPreviewQuestion = () => {
    const totalQuestions = questions.length; // Exclure démographique du total
    const adjustedIndex = demographicEnabled ? currentPreviewIndex - 1 : currentPreviewIndex;
    const question = adjustedIndex >= 0 ? questions[adjustedIndex] : null;
  
    if (currentPreviewIndex === 0 && demographicEnabled) {
      return renderDemographicPreview();
    }
  
    if (!question) return null;
  
    return (
      <Box
        sx={{
          mt: 2,
          p: 3,
          backgroundColor: "#fff",
          border: "1px solid #ddd",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          position: "relative",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            mb: 2,
            textAlign: "center",
            fontWeight: "bold",
            color: "#333",
          }}
        >
          {question.text || "Untitled Question"}
        </Typography>
  

{question.media && (
  <Box sx={{ mb: 2, textAlign: "center" }}>
        <Box>
  {(() => {
    console.log("Rendering media:", question.media);
    return null; // Renvoyez un élément valide, ici `null` pour ne rien afficher
  })()}
</Box>



    {/* Vérifiez si le média est une vidéo ou une image */}
    {question.media.startsWith("blob:") || question.media.endsWith(".mp4") || question.media.endsWith(".mov") ? (
      <ReactPlayer
        url={question.media}
        controls
        width="50%"
        height="200px"
        style={{
          margin: "0 auto",
          borderRadius: "8px",
          overflow: "hidden",
        }}
        onError={(e) => console.error("ReactPlayer error:", e)}
      />
    ) : question.media.match(/\.(jpg|jpeg|png)$/) ? (
      <img
        src={question.media}
        alt="Uploaded Media"
        style={{
          maxWidth: "50%",
          maxHeight: "200px",
          display: "block",
          margin: "0 auto",
        }}
        onError={(e) => console.error("Image rendering error:", e)}
      />
    ) : (
      <Typography color="error">Invalid media format</Typography>
    )}
  </Box>
)}

        {/* Display the rest of the question */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center", // Centre tous les composants
            gap: 2, // Espacement entre les composants
          }}
        >
          {question.type === "multiple-choice" && (
            <RadioGroup>
              {localOptions[question.id]?.map((option, index) => (
                <FormControlLabel key={index} value={option} control={<Radio />} label={option} />
              ))}
            </RadioGroup>
          )}
          {question.type === "text" && <TextField fullWidth variant="outlined" placeholder="Your answer" />}
          {question.type === "dropdown" && (
            <Select fullWidth>
              {localOptions[question.id]?.map((option, index) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          )}
          {question.type === "slider" && <Slider valueLabelDisplay="auto" />}
          {question.type === "rating" && <Rating />}
          {question.type === "yes-no" && (
            <RadioGroup>
              <FormControlLabel value="yes" control={<Radio />} label="Yes" />
              <FormControlLabel value="no" control={<Radio />} label="No" />
            </RadioGroup>
          )}
          {question.type === "date" && (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Select a date"
                value={question.selectedDate || null}
                onChange={(newDate) =>
                  setValue(
                    `questions`,
                    questions.map((q) => (q.id === question.id ? { ...q, selectedDate: newDate } : q))
                  )
                }
                renderInput={(params) => <TextField {...params} />}
              />
            </LocalizationProvider>
          )}
          {question.type === "file-upload" && (
            <Button variant="outlined" component="label">
              Upload File
              <input
                type="file"
                hidden
                onChange={(e) => e.target.files && setUploadedFile(e.target.files[0])}
              />
            </Button>
          )}
          {uploadedFile && (
            <Typography sx={{ mt: 2 }} variant="body2">
              Uploaded file: {uploadedFile.name}
            </Typography>
          )}
          {question.type === "color-picker" && (
            <Box>
              <ChromePicker
                color={{
                  r: selectedColors[question.id]?.color
                    ? parseInt(selectedColors[question.id].color.slice(1, 3), 16)
                    : 0,
                  g: selectedColors[question.id]?.color
                    ? parseInt(selectedColors[question.id].color.slice(3, 5), 16)
                    : 0,
                  b: selectedColors[question.id]?.color
                    ? parseInt(selectedColors[question.id].color.slice(5, 7), 16)
                    : 0,
                  a: selectedColors[question.id]?.alpha || 1,
                }}
                onChangeComplete={(color) => {
                  setSelectedColors((prev) => ({
                    ...prev,
                    [question.id]: {
                      color: color.hex,
                      alpha: color.rgb.a || 1,
                    },
                  }));
                }}
                styles={{
                  default: {
                    picker: {
                      width: "300px",
                      height: "auto",
                      boxShadow: "0 0 10px rgba(0,0,0,0.1)",
                      borderRadius: "10px",
                    },
                  },
                }}
              />
              <Box
                sx={{
                  width: 120,
                  height: 60,
                  mt: 2,
                  backgroundColor: `rgba(${parseInt(
                    selectedColors[question.id]?.color?.slice(1, 3) || "00",
                    16
                  )}, 
                                ${parseInt(selectedColors[question.id]?.color?.slice(3, 5) || "00", 16)}, 
                                ${parseInt(selectedColors[question.id]?.color?.slice(5, 7) || "00", 16)}, 
                                ${selectedColors[question.id]?.alpha || 1})`,
                  border: "1px solid #ddd",
                }}
              />
            </Box>
          )}
        </Box>
  
        {/* Affichage du numéro de question */}
        <Typography variant="body2" sx={{ mt: 2, textAlign: "center", color: "gray" }}>
          Question {adjustedIndex + 1} of {totalQuestions}
        </Typography>
      </Box>
    );
  };
  

  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Survey Creation
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)}>
  <Controller
    name="title"
    control={control}
    rules={{ required: "Title is required" }} // Validation
    render={({ field, fieldState }) => (
      <TextField
        {...field}
        label="Survey Title"
        fullWidth
        sx={{ mb: 2 }}
        variant="outlined"
        error={!!fieldState.error} // Afficher l'erreur
        helperText={fieldState.error?.message} // Message d'erreur
      />
    )}
  />
  <Controller
    name="description"
    control={control}
    render={({ field }) => (
      <TextField {...field} label="Survey Description" fullWidth sx={{ mb: 2 }} variant="outlined" />
    )}
  />

  <FormControlLabel
    control={
      <Switch
        checked={demographicEnabled}
        onChange={(e) => setValue("demographicEnabled", e.target.checked)}
      />
    }
    label="Include Demographic Questions"
  />

{fields.map((field, index) => (
  <Box key={field.id} sx={{ mb: 3, pb: 3, borderBottom: "1px solid lightgray" }}>
    {/* Question Text */}
    <Controller
      name={`questions.${index}.text`}
      control={control}
      render={({ field: { onChange, value } }) => (
        <TextField 
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value);  // Modification ici
          }}
          label={`Question ${index + 1}`} 
          fullWidth 
          sx={{ mb: 2 }} 
        />
      )}
    />
    
    {/* Question Type */}
    <TextField
      select
      label="Question Type"
      fullWidth
      sx={{ mb: 2 }}
      value={field.type}
      onChange={(e) => handleQuestionTypeChange(index, e.target.value)}
    >
      {questionTypes.map((type) => (
        <MenuItem key={type.value} value={type.value}>
          {type.label}
        </MenuItem>
      ))}
    </TextField>
    

    {/* Render Options for Multiple-Choice or Dropdown */}
    {["multiple-choice", "dropdown"].includes(field.type) && (
      <Box sx={{ mb: 2 }}>
        {localOptions[field.id]?.map((option, optionIndex) => (
          <Box key={optionIndex} sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <TextField
              value={option}
              onChange={(e) => handleOptionChange(field.id, optionIndex, e.target.value)}
              fullWidth
              variant="outlined"
            />
            <IconButton
              onClick={() =>
                setLocalOptions((prev) => {
                  const updated = [...(prev[field.id] || [])];
                  updated.splice(optionIndex, 1);
                  return { ...prev, [field.id]: updated };
                })
              }
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        ))}
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => handleAddOption(field.id)}
        >
          Add Option
        </Button>
      </Box>
    )}

   {/* Media Upload and URL Input */}
   <Box sx={{ mt: 3 }}>
   <Controller
  name={`questions.${index}.media`}
  control={control}
  render={({ field }) => {
    console.log(`Rendering media for question ${fields[index].id}:`, field.value);
    return (
      <TextField
        {...field}
        label="Media URL"
        placeholder="Enter a valid media URL or upload a file"
        fullWidth
      />
    );
  }}
/>



  <Button
    variant="outlined"
    component="label"
    startIcon={<PhotoCameraIcon />}
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      textTransform: "none",
      mt: 2,
    }}
  >
    Upload File
    <input
      type="file"
      hidden
      onChange={(e) => {
        if (e.target.files?.[0]) {
          const file = e.target.files[0];
          handleFileUpload(file, field.id); // Passe l'ID de la question
        }
      }}
    />
  </Button>
</Box>



    {/* Delete Question Button */}
    <Button
      onClick={() => handleDeleteQuestion(index)}
      startIcon={<DeleteIcon />}
      color="secondary"
      sx={{ mt: 2 }}
    >
      Delete Question
    </Button>
  </Box>
))}

  {/* Bouton Add Question (avec une icône) */}
<Box
  sx={{
    display: "flex",
    justifyContent: "flex-start",
    mt: 3,
    mb: 2, // Espacement entre Add Question et les autres boutons
  }}
>
  <Button
    onClick={handleAddQuestion}
    variant="outlined"
    startIcon={<AddIcon />} // Icône de "plus" ajoutée ici
    sx={{
      backgroundColor: "white",
      color: "#007bff", // Bleu pour Add Question
      border: "1px solid #007bff",
      borderRadius: "8px",
      textTransform: "none",
      padding: "10px 20px",
      fontSize: "14px",
      fontWeight: "500",
      "&:hover": {
        backgroundColor: "#e8f4ff", // Fond bleu clair sur survol
        borderColor: "#0056b3",
      },
    }}
  >
    Add Question
  </Button>
</Box>

{/* Section avec Reset Survey, Preview et Submit */}
<Box
  sx={{
    display: "flex",
    justifyContent: "flex-start", // Aligne tous les boutons sur une ligne
    gap: 2, // Espacement uniforme entre les boutons
  }}
>
  {/* Bouton Reset Survey (avec une icône) */}
  <Button
    onClick={handleResetSurvey}
    variant="outlined"
    startIcon={<DeleteIcon />} // Icône de "poubelle" ajoutée ici
    sx={{
      backgroundColor: "white",
      color: "#dc3545", // Rouge pour Reset Survey
      border: "1px solid #dc3545",
      borderRadius: "8px",
      textTransform: "none",
      padding: "10px 20px",
      fontSize: "14px",
      fontWeight: "500",
      "&:hover": {
        backgroundColor: "#f8d7da", // Fond rouge clair sur survol
        borderColor: "#c82333",
        color: "#721c24",
      },
    }}
  >
    Reset Survey
  </Button>

  {/* Bouton Preview (avec une icône) */}
  <Button
    onClick={() => setShowPreview(true)}
    variant="outlined"
    startIcon={<VisibilityIcon />} // Icône d'œil ajoutée ici
    sx={{
      backgroundColor: "white",
      color: "#6f42c1", // Violet pour Preview
      border: "1px solid #6f42c1",
      borderRadius: "8px",
      textTransform: "none",
      padding: "10px 20px",
      fontSize: "14px",
      fontWeight: "500",
      "&:hover": {
        backgroundColor: "#ede7f6", // Fond violet clair sur survol
        borderColor: "#5a32a3",
      },
    }}
  >
    Preview
  </Button>

  {/* Bouton Submit (avec une icône) */}
  <Button
    type="submit"
    variant="outlined"
    startIcon={<CheckCircleIcon />} // Icône de validation ajoutée ici
    sx={{
      backgroundColor: "white",
      color: "#28a745", // Vert pour Submit
      border: "1px solid #28a745",
      borderRadius: "8px",
      textTransform: "none",
      padding: "10px 20px",
      fontSize: "14px",
      fontWeight: "500",
      "&:hover": {
        backgroundColor: "#e6f7e9", // Fond vert clair sur survol
        borderColor: "#218838",
      },
    }}
  >
    Submit
  </Button>
</Box>

</form>

      {showPreview && (
        <Dialog open={showPreview} onClose={() => setShowPreview(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ textAlign: "center", fontWeight: "bold", fontSize: "1.5rem", color: "#444" }}>
          Survey Preview
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: "#f7f9fc", padding: "24px" }}>
          <Typography variant="h5" sx={{ mb: 2, textAlign: "center", color: "#555" }}>
            {watch("title") || "Untitled Survey"}
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              mb: 4,
              textAlign: "center",
              fontStyle: "italic",
              color: "#777",
              borderBottom: "1px solid #ddd",
              paddingBottom: "12px",
            }}
          >
            {watch("description") || "No description provided."}
          </Typography>
          {renderPreviewQuestion()}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", padding: "16px 24px" }}>
          <Button
            onClick={() => setCurrentPreviewIndex((prev) => Math.max(prev - 1, 0))}
            disabled={currentPreviewIndex === 0}
            variant="outlined"
            color="primary"
          >
            Previous
          </Button>
          <Button
            onClick={() =>
              setCurrentPreviewIndex((prev) =>
                Math.min(prev + 1, questions.length + (demographicEnabled ? 1 : 0) - 1)
              )
            }
            disabled={currentPreviewIndex === questions.length + (demographicEnabled ? 1 : 0) - 1}
            variant="outlined"
            color="primary"
          >
            Next
          </Button>
          <Button onClick={() => setShowPreview(false)} variant="contained" color="secondary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      )}
    </Box>
  );
};

export default SurveyCreationPage;