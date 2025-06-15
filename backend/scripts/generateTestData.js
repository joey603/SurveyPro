const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Survey = require('../models/Survey');
const DynamicSurvey = require('../models/DynamicSurvey');
const SurveyAnswer = require('../models/SurveyAnswer');
const DynamicSurveyAnswer = require('../models/DynamicSurveyAnswer');
require('dotenv').config();

// Fonction pour générer des utilisateurs aléatoires
const generateRandomUsers = async (count) => {
  const users = [];
  // Mot de passe conforme aux exigences (au moins 8 caractères avec 1 majuscule et 1 chiffre)
  const securePassword = 'Password123';
  const hashedPassword = await bcrypt.hash(securePassword, 10);
  
  for (let i = 0; i < count; i++) {
    const username = `testUser${i + 1}`;
    const email = `test${i + 1}@example.com`;
    
    const user = new User({
      username,
      email,
      password: hashedPassword,
      isVerified: true
    });
    
    await user.save();
    users.push(user);
  }
  return users;
};

// Fonction pour générer un sondage statique public
const createPublicStaticSurvey = async (userId) => {
  const survey = new Survey({
    title: "Public Static Survey - Test",
    description: "This survey contains all types of questions available",
    isPrivate: false,
    demographicEnabled: true,
    questions: [
      {
        id: "q1",
        type: "dropdown",
        text: "What is your favorite color ?",
        options: ["Red", "Blue", "Green", "Yellow"]
      },
      {
        id: "q2",
        type: "text",
        text: "Describe your ideal day"
      },
      {
        id: "q3",
        type: "dropdown",
        text: "What is your education level ?",
        options: ["Bachelor", "Master", "Doctorate"]
      },
      {
        id: "q4",
        type: "yes-no",
        text: "Do you like surveys ?"
      },
      {
        id: "q5",
        type: "slider",
        text: "Rate your general satisfaction (1-10)"
      },
      {
        id: "q6",
        type: "rating",
        text: "Rate our service"
      },
      {
        id: "q7",
        type: "date",
        text: "What is your date of birth ?"
      }
    ],
    userId
  });
  
  return await survey.save();
};

// Fonction pour générer un sondage statique privé
const createPrivateStaticSurvey = async (userId) => {
  const survey = new Survey({
    title: "Survey Private Static - Test",
    description: "This survey contains all types of questions available",
    isPrivate: true,
    demographicEnabled: true,
    questions: [
      {
        id: "q1",
        type: "dropdown",
        text: "What is your favorite food ?",
        options: ["Pizza", "Sushi", "Pasta", "Salad"]
      },
      {
        id: "q2",
        type: "text",
        text: "What is your greatest achievement ?"
      },
      {
        id: "q3",
        type: "dropdown",
        text: "What is your favorite sport ?",
        options: ["Football", "Tennis", "Swimming", "Running"]
      },
      {
        id: "q4",
        type: "yes-no",
        text: "Do you practice a sport regularly ?"
      },
      {
        id: "q5",
        type: "slider",
        text: "What is your motivation for the sport (1-10) ?"
      },
      {
        id: "q6",
        type: "rating",
        text: "Rate your physical condition"
      },
      {
        id: "q7",
        type: "date",
        text: "When did you start practicing sport ?"
      }
    ],
    userId
  });
  
  return await survey.save();
};

// Fonction pour générer un sondage dynamique public
const createPublicDynamicSurvey = async (userId) => {
  const survey = new DynamicSurvey({
    title: "Dynamic Survey Public - Test",
    description: "This dynamic survey contains conditional questions",
    isPrivate: false,
    demographicEnabled: true,
    nodes: [
      {
        id: "1",
        type: "questionNode",
        data: {
          id: "1",
          questionNumber: 1,
          type: "text",
          text: "What is your favorite activity ?",
          options: [],
          media: "",
          mediaUrl: "",
          isCritical: false
        },
        position: { x: 250, y: 50 }
      },
      {
        id: "2",
        type: "questionNode",
        data: {
          id: "2",
          questionNumber: 2,
          type: "yes-no",
          text: "Is this activity important for you ?",
          options: ["Yes", "No"],
          media: "",
          mediaUrl: "",
          isCritical: true
        },
        position: { x: 250, y: 200 }
      },
      {
        id: "3",
        type: "questionNode",
        data: {
          id: "3",
          questionNumber: 3,
          type: "dropdown",
          text: "At what frequency do you practice this activity ?",
          options: ["Daily", "Weekly", "Monthly"],
          media: "",
          mediaUrl: "",
          isCritical: true
        },
        position: { x: 100, y: 350 }
      },
      {
        id: "4",
        type: "questionNode",
        data: { 
          id: "4",
          questionNumber: 4,
        type: "dropdown",
          text: "Where do you practice this activity ?",
          options: ["At home", "Outside", "In a club"],
          media: "",
          mediaUrl: "",
          isCritical: false
        },
        position: { x: 400, y: 350 }
      },
      {
        id: "5",
        type: "questionNode",
        data: {
          id: "5",
          questionNumber: 5,
          type: "slider",
          text: "On a scale of 1 to 10, what is your satisfaction level ?",
          options: [],
          media: "",
          mediaUrl: "",
          isCritical: false
        },
        position: { x: 0, y: 500 }
      },
      {
        id: "6",
        type: "questionNode",
        data: {
          id: "6",
          questionNumber: 6,
          type: "rating",
          text: "Rate your expertise in this field",
          options: [],
          media: "",
          mediaUrl: "",
          isCritical: false
        },
        position: { x: 150, y: 500 }
      },
      {
        id: "7",
        type: "questionNode",
        data: {
          id: "7",
          questionNumber: 7,
          type: "date",
          text: "When did you discover this activity ?",
          options: [],
          media: "",
          mediaUrl: "",
          isCritical: false
        },
        position: { x: 300, y: 500 }
      },
      {
        id: "8",
        type: "questionNode",
        data: { 
          id: "8",
          questionNumber: 8,
          type: "text",
          text: "Do you have any additional comments ?",
          options: [],
          media: "",
          mediaUrl: "",
          isCritical: false
        },
        position: { x: 250, y: 650 }
      }
    ],
    edges: [
      { 
        id: "e1-2", 
        source: "1", 
        target: "2",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      },
      { 
        id: "e2-3", 
        source: "2", 
        target: "3", 
        label: "Yes",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      },
      { 
        id: "e2-4", 
        source: "2", 
        target: "4", 
        label: "No",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      },
      { 
        id: "e3-5", 
        source: "3", 
        target: "5", 
        label: "Daily",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      },
      { 
        id: "e3-6", 
        source: "3", 
        target: "6", 
        label: "Weekly",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      },
      { 
        id: "e3-7", 
        source: "3", 
        target: "7", 
        label: "Monthly",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      },
      { 
        id: "e4-8", 
        source: "4", 
        target: "8",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      },
      { 
        id: "e5-8", 
        source: "5", 
        target: "8",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      },
      { 
        id: "e6-8", 
        source: "6", 
        target: "8",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      },
      { 
        id: "e7-8", 
        source: "7", 
        target: "8",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      }
    ],
    userId
  });
  
  return await survey.save();
};

// Fonction pour générer un sondage dynamique privé
const createPrivateDynamicSurvey = async (userId) => {
  const survey = new DynamicSurvey({
    title: "Dynamic Survey Private - Test",
    description: "This dynamic survey contains conditional questions",
    isPrivate: true,
    demographicEnabled: true,
    nodes: [
      {
        id: "1",
        type: "questionNode",
        data: { 
          id: "1",
          questionNumber: 1,
          type: "text",
          text: "What is your current profession ?",
          options: [],
          media: "",
          mediaUrl: "",
          isCritical: false
        },
        position: { x: 250, y: 50 }
      },
      {
        id: "2",
        type: "questionNode",
        data: {
          id: "2",
          questionNumber: 2,
          type: "yes-no",
          text: "Are you satisfied with your professional career ?",
          options: ["Yes", "No"],
          media: "",
          mediaUrl: "",
          isCritical: true
        },
        position: { x: 250, y: 200 }
      },
      {
        id: "3",
        type: "questionNode",
        data: {
          id: "3",
          questionNumber: 3,
          type: "dropdown",
          text: "In which field do you work ?",
          options: ["Technology", "Health", "Education", "Commerce"],
          media: "",
          mediaUrl: "",
          isCritical: true
        },
        position: { x: 100, y: 350 }
      },
      {
        id: "4",
        type: "questionNode",
        data: { 
          id: "4",
          questionNumber: 4,
        type: "dropdown",
          text: "What motivates you in your work ?",
          options: ["Salary", "Colleagues", "Management", "Tasks"],
          media: "",
          mediaUrl: "",
          isCritical: false
        },
        position: { x: 400, y: 350 }
      },
      {
        id: "5",
        type: "questionNode",
        data: {
          id: "5",
          questionNumber: 5,
          type: "slider",
          text: "On a scale of 1 to 10, rate your technical expertise",
          options: [],
          media: "",
          mediaUrl: "",
          isCritical: false
        },
        position: { x: 0, y: 500 }
      },
      {
        id: "6",
        type: "questionNode",
        data: {
          id: "6",
          questionNumber: 6,
          type: "rating",
          text: "Rate the quality of your working environment",
          options: [],
          media: "",
          mediaUrl: "",
          isCritical: false
        },
        position: { x: 150, y: 500 }
      },
      {
        id: "7",
        type: "questionNode",
        data: {
          id: "7",
          questionNumber: 7,
          type: "text",
          text: "What skill do you want to develop ?",
          options: [],
          media: "",
          mediaUrl: "",
          isCritical: false
        },
        position: { x: 300, y: 500 }
      },
      {
        id: "8",
        type: "questionNode",
        data: {
          id: "8",
          questionNumber: 8,
          type: "text",
          text: "Do you have any suggestions to improve your professional environment ?",
          options: [],
          media: "",
          mediaUrl: "",
          isCritical: false
        },
        position: { x: 250, y: 650 }
      }
    ],
    edges: [
      { 
        id: "e1-2", 
        source: "1", 
        target: "2",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      },
      { 
        id: "e2-3", 
        source: "2", 
        target: "3", 
        label: "Yes",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      },
      { 
        id: "e2-4", 
        source: "2", 
        target: "4", 
        label: "No",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      },
      { 
        id: "e3-5", 
        source: "3", 
        target: "5", 
        label: "Technology",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      },
      { 
        id: "e3-6", 
        source: "3", 
        target: "6", 
        label: "Health",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      },
      { 
        id: "e3-7", 
        source: "3", 
        target: "7", 
        label: "Education",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      },
      { 
        id: "e3-8", 
        source: "3", 
        target: "8", 
        label: "Commerce",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      },
      { 
        id: "e4-8", 
        source: "4", 
        target: "8",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      },
      { 
        id: "e5-8", 
        source: "5", 
        target: "8",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      },
      { 
        id: "e6-8", 
        source: "6", 
        target: "8",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      },
      { 
        id: "e7-8", 
        source: "7", 
        target: "8",
        type: "customEdge",
        sourceHandle: null,
        targetHandle: null
      }
    ],
    userId
  });
  
  return await survey.save();
};

// Fonction pour générer une date de naissance aléatoire
const generateRandomBirthDate = () => {
  const minAge = 18;
  const maxAge = 80;
  const randomAge = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
  const birthDate = new Date();
  birthDate.setFullYear(birthDate.getFullYear() - randomAge);
  birthDate.setMonth(Math.floor(Math.random() * 12));
  birthDate.setDate(Math.floor(Math.random() * 28) + 1);
  return birthDate;
};

// Fonction pour générer une date de soumission aléatoire dans les 30 derniers jours
const generateRandomSubmissionDate = () => {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30); // 0 à 29 jours dans le passé
  const hoursAgo = Math.floor(Math.random() * 24); // 0 à 23 heures
  const minutesAgo = Math.floor(Math.random() * 60); // 0 à 59 minutes
  
  const submissionDate = new Date(now);
  submissionDate.setDate(submissionDate.getDate() - daysAgo);
  submissionDate.setHours(submissionDate.getHours() - hoursAgo);
  submissionDate.setMinutes(submissionDate.getMinutes() - minutesAgo);
  
  return submissionDate;
};

// Fonction pour générer des réponses aléatoires
const generateRandomAnswers = async (users, surveys) => {
  for (const user of users) {
    for (const survey of surveys) {
      // Générer des réponses pour les sondages statiques
      if (survey instanceof Survey) {
        const answers = survey.questions.map(question => {
          let answer;
          switch (question.type) {
            case 'dropdown':
              answer = question.options[Math.floor(Math.random() * question.options.length)];
              break;
            case 'text':
              answer = `Detailed response from ${user.username} to the question "${question.text || 'no text'}"`;
              break;
            case 'yes-no':
              answer = Math.random() > 0.5 ? 'Yes' : 'No';
              break;
            case 'rating':
              answer = Math.floor(Math.random() * 5) + 1;
              break;
            case 'slider':
              // Pour les questions avec échelle de 1 à 10
              if (question.text.includes("technical expertise") || 
                  question.text.includes("satisfaction level")) {
                // Générer un nombre entier entre 1 et 10
                answer = Math.floor(Math.random() * 10) + 1;
                // Convertir en chaîne pour être sûr
                answer = answer.toString();
                
                if (question.text.includes("technical expertise")) {
                  console.log(`Question statique d'expertise technique: réponse = ${answer}`);
                } else if (question.text.includes("satisfaction level")) {
                  console.log(`Question statique de satisfaction: réponse = ${answer}`);
                }
              } else {
                answer = Math.floor(Math.random() * 10) + 1;
              }
              break;
            case 'date':
              const date = new Date();
              date.setDate(date.getDate() - Math.floor(Math.random() * 365));
              answer = date.toISOString().split('T')[0];
              break;
            default:
              answer = 'Default response';
          }
          return { questionId: question.id, answer };
        });

        const surveyAnswer = new SurveyAnswer({
          surveyId: survey._id,
          respondent: {
            userId: user._id,
            demographic: {
              gender: Math.random() > 0.5 ? 'male' : 'female',
              dateOfBirth: generateRandomBirthDate(),
              educationLevel: ['High School', 'Bachelor', 'Master', 'Doctorate'][Math.floor(Math.random() * 4)],
              city: ['Ashdod', 'Tel Aviv', 'Jerusalem', 'Haifa', 'Netanya', 'Beer Sheva'][Math.floor(Math.random() * 6)]
            }
          },
          answers,
          submittedAt: generateRandomSubmissionDate()
        });

        await surveyAnswer.save();
      }
      // Générer des réponses pour les sondages dynamiques
      else if (survey instanceof DynamicSurvey) {
        // Exactement une réponse par utilisateur pour chaque sondage
        // Simuler différents chemins en choisissant différentes réponses aux questions critiques
        const isCriticalAnswerYes = Math.random() > 0.5; // Réponse aléatoire pour les questions critiques
        
        // Trouver le premier nœud (généralement avec id "1")
        const firstNode = survey.nodes.find(node => node.id === "1");
        if (!firstNode) continue;

        // Créons une carte de tous les nœuds pour un accès facile
        const nodesMap = {};
        survey.nodes.forEach(node => {
          nodesMap[node.id] = node;
        });
        
        // Créons une carte des arêtes sortantes pour chaque nœud
        const outgoingEdgesMap = {};
        survey.edges.forEach(edge => {
          if (!outgoingEdgesMap[edge.source]) {
            outgoingEdgesMap[edge.source] = [];
          }
          outgoingEdgesMap[edge.source].push(edge);
        });
        
        // Identifier les nœuds terminaux (sans arêtes sortantes)
        const endNodes = survey.nodes.filter(node => {
          return !survey.edges.some(edge => edge.source === node.id);
        });
        
        if (endNodes.length === 0) {
          console.log("No terminal node found for the survey:", survey.title);
          continue; // Passer au sondage suivant
        }
        
        // Tableau pour stocker les réponses et le chemin
        const answers = [];
        const path = [];
        const fullPath = [];
        
        // Commencer par le premier nœud
        const initialTimestamp = generateRandomSubmissionDate();
        
        // Répondre à la première question
        let firstNodeAnswer;
        switch (firstNode.data.type) {
          case 'text':
            firstNodeAnswer = `Response from ${user.username} to "${firstNode.data.text}"`;
            break;
          case 'dropdown':
            firstNodeAnswer = firstNode.data.options[Math.floor(Math.random() * firstNode.data.options.length)];
            break;
          case 'yes-no':
            firstNodeAnswer = isCriticalAnswerYes ? 'Yes' : 'No';
            break;
          default:
            firstNodeAnswer = 'Response to the first question';
        }
        
        // Ajouter la première réponse
        answers.push({
          nodeId: firstNode.id,
          answer: firstNodeAnswer,
          answeredAt: new Date(initialTimestamp)
        });
        
        // Ajouter le premier nœud au chemin
          path.push({
          nodeId: firstNode.id,
          timestamp: new Date(initialTimestamp)
        });
        
        // Ajouter le premier nœud au chemin complet
        fullPath.push({
          questionId: firstNode.id,
          questionText: firstNode.data.text,
          answer: firstNodeAnswer
        });
        
        // Visiter récursivement tous les nœuds suivants
        const visitedNodes = new Set([firstNode.id]);
        
        // Trouver la prochaine arête à partir du premier nœud
        const firstNodeOutgoingEdges = outgoingEdgesMap[firstNode.id] || [];
        
        // Si pas d'arêtes sortantes, c'est déjà un chemin complet
        if (firstNodeOutgoingEdges.length === 0) {
          // Si c'est un nœud terminal, le chemin est considéré comme complet
          const isComplete = endNodes.some(node => node.id === firstNode.id);
          
          // Créer et enregistrer la réponse
          const surveyAnswer = new DynamicSurveyAnswer({
            surveyId: survey._id,
            respondent: {
              userId: user._id,
              demographic: {
                gender: Math.random() > 0.5 ? 'male' : 'female',
                dateOfBirth: generateRandomBirthDate(),
                educationLevel: ['High School', 'Bachelor', 'Master', 'Doctorate'][Math.floor(Math.random() * 4)],
                city: ['Ashdod', 'Tel Aviv', 'Jerusalem', 'Haifa', 'Netanya', 'Beer Sheva'][Math.floor(Math.random() * 6)]
              }
            },
            answers,
            path,
            submittedAt: initialTimestamp,
            completionStatus: isComplete ? 'completed' : 'partial'
          });
          
          // Enregistrer la réponse
          await surveyAnswer.save();
          
          // Afficher le chemin pour débogage
          console.log(`Chemin généré pour l'utilisateur ${user.username}, sondage ${survey.title}:`);
          console.log(JSON.stringify(fullPath, null, 2));
          
          continue; // Passer au sondage suivant
        }
        
        // Fonction pour choisir une arête et continuer le chemin
        const followPath = (currentNodeId, depth) => {
          // Éviter les boucles infinies
          if (depth > 20) return false;
          
          const currentNode = nodesMap[currentNodeId];
          if (!currentNode) return false;
          
          // Trouver les arêtes sortantes du nœud actuel
          const outgoingEdges = outgoingEdgesMap[currentNodeId] || [];
          if (outgoingEdges.length === 0) {
            // Si pas d'arêtes sortantes, c'est la fin du chemin
            return endNodes.some(node => node.id === currentNodeId);
          }
          
          // Choisir la prochaine arête et générer une réponse
          let nextEdge;
            let answer;
          
          if (currentNode.data.isCritical || currentNode.data.type === 'yes-no' || currentNode.data.type === 'dropdown') {
            // Pour les questions critiques, choisir en fonction de isCriticalAnswerYes
            if (currentNode.data.type === 'yes-no') {
              answer = isCriticalAnswerYes ? 'Yes' : 'No';
            } else if (currentNode.data.options && currentNode.data.options.length > 0) {
              // Pour les dropdowns, si c'est la question du domaine de travail, toujours choisir "Technology"
              if (currentNode.data.text.includes("field do you work")) {
                answer = "Technology";
                console.log("Réponse forcée à 'Technology' pour la question du domaine de travail");
              } else {
                // Pour les autres dropdowns, prendre la première option
                answer = currentNode.data.options[0];
              }
            } else {
              answer = 'Default option';
            }
            
            // Trouver l'arête correspondant à la réponse
            nextEdge = outgoingEdges.find(edge => edge.label === answer);
            
            // Pour le nœud 3 (domaine de travail), forcer l'arête "Technology"
            if (currentNodeId === "3" && answer === "Technology") {
              nextEdge = outgoingEdges.find(edge => edge.label === "Technology");
              console.log("Arête forcée à 'Technology' pour le nœud 3");
            }
            
            // Si pas d'arête correspondante, prendre la première
            if (!nextEdge && outgoingEdges.length > 0) {
              nextEdge = outgoingEdges[0];
              // Adapter la réponse pour qu'elle corresponde à l'arête
              if (nextEdge.label) {
                answer = nextEdge.label;
              }
            }
          } else {
            // Pour les questions non critiques, prendre la première arête
            nextEdge = outgoingEdges[0];
            
            // Générer une réponse appropriée pour le type de question
            switch (currentNode.data.type) {
              case 'text':
                answer = `Response from ${user.username} to "${currentNode.data.text}"`;
                break;
              case 'dropdown':
                if (currentNode.data.options && currentNode.data.options.length > 0) {
                  answer = currentNode.data.options[Math.floor(Math.random() * currentNode.data.options.length)];
                } else {
                  answer = "Default option";
                }
                break;
              case 'yes-no':
                answer = Math.random() > 0.5 ? 'Yes' : 'No';
                break;
              case 'rating':
                answer = Math.floor(Math.random() * 5) + 1;
                break;
              case 'slider':
                // Pour les questions d'expertise technique, générer un nombre entre 1 et 10
                if (currentNode.data.text.includes("technical expertise")) {
                  // Générer un nombre entier entre 1 et 10
                  answer = Math.floor(Math.random() * 10) + 1;
                  // Convertir en chaîne pour être sûr
                  answer = answer.toString();
                  console.log(`Réponse d'expertise technique générée: ${answer} (nœud ${currentNode.id})`);
                } else {
                  answer = Math.floor(Math.random() * 10) + 1;
                }
                break;
              case 'date':
                const date = new Date();
                date.setDate(date.getDate() - Math.floor(Math.random() * 365));
                answer = date.toISOString().split('T')[0];
                break;
              default:
                answer = `Standard response to the question ${currentNode.id}`;
            }
          }
          
          // Si pas d'arête trouvée, c'est la fin du chemin
          if (!nextEdge) {
            return endNodes.some(node => node.id === currentNodeId);
          }
          
          // Éviter les boucles en vérifiant si nous avons déjà visité le nœud cible
          if (visitedNodes.has(nextEdge.target)) {
            return false;
          }
          
          // Marquer le nœud cible comme visité
          visitedNodes.add(nextEdge.target);
          
          // Trouver le nœud cible
          const nextNode = nodesMap[nextEdge.target];
          if (!nextNode) {
            return false;
          }
          
          // Ajouter la réponse au nœud actuel
          const answerTimestamp = new Date(initialTimestamp);
          answerTimestamp.setSeconds(answerTimestamp.getSeconds() + 30 * answers.length);
          
                     // Pour les questions avec échelle de 1 à 10
           if (nextNode.data.text && (nextNode.data.text.includes("technical expertise") || 
               nextNode.data.text.includes("satisfaction level"))) {
             // Générer un nombre entre 1 et 10
             const numAnswer = Math.floor(Math.random() * 10) + 1;
             
             if (nextNode.data.text.includes("technical expertise")) {
               console.log(`Question d'expertise technique: réponse générée = ${numAnswer} (pour les answers)`);
             } else if (nextNode.data.text.includes("satisfaction level")) {
               console.log(`Question de satisfaction: réponse générée = ${numAnswer} (pour les answers)`);
             }
             
             answers.push({
               nodeId: nextNode.id,
               answer: numAnswer.toString(),
               answeredAt: new Date(answerTimestamp)
             });
           } else {
             answers.push({
               nodeId: nextNode.id,
               answer: answer,
               answeredAt: new Date(answerTimestamp)
             });
           }
          
          // Ajouter le nœud au chemin
          const pathTimestamp = new Date(initialTimestamp);
          pathTimestamp.setSeconds(pathTimestamp.getSeconds() + 30 * path.length);
          
          path.push({
            nodeId: nextNode.id,
            timestamp: new Date(pathTimestamp)
          });
          
          // Ajouter le segment au chemin complet
          if (nextNode.data.text && (nextNode.data.text.includes("technical expertise") || 
              nextNode.data.text.includes("satisfaction level"))) {
            // Générer un nombre entre 1 et 10 pour les questions avec échelle
            const numAnswer = Math.floor(Math.random() * 10) + 1;
            
            if (nextNode.data.text.includes("technical expertise")) {
              console.log(`Question d'expertise technique: réponse générée = ${numAnswer}`);
            } else if (nextNode.data.text.includes("satisfaction level")) {
              console.log(`Question de satisfaction: réponse générée = ${numAnswer}`);
            }
            
            fullPath.push({
              questionId: nextNode.id,
              questionText: nextNode.data.text,
              answer: numAnswer.toString()
            });
          } else {
            fullPath.push({
              questionId: nextNode.id,
              questionText: nextNode.data.text,
              answer: answer
            });
          }
          
          // Continuer récursivement avec le nœud suivant
          return followPath(nextNode.id, depth + 1);
        };
        
        // Commencer à parcourir le chemin à partir du premier nœud
        // Choisir la première arête sortante
        let firstEdge;
        
        if (firstNode.data.isCritical || firstNode.data.type === 'yes-no' || firstNode.data.type === 'dropdown') {
          // Pour les questions critiques, chercher l'arête correspondant à la réponse
          firstEdge = firstNodeOutgoingEdges.find(edge => edge.label === firstNodeAnswer);
          
          // Si pas d'arête correspondante, prendre la première
          if (!firstEdge && firstNodeOutgoingEdges.length > 0) {
            firstEdge = firstNodeOutgoingEdges[0];
          }
        } else {
          // Pour les questions non critiques, prendre la première arête
          firstEdge = firstNodeOutgoingEdges[0];
        }
        
        // Si pas d'arête, c'est déjà un chemin complet
        if (!firstEdge) {
          // Vérifier si le premier nœud est terminal
          const isComplete = endNodes.some(node => node.id === firstNode.id);
          
          // Créer et enregistrer la réponse
            const surveyAnswer = new DynamicSurveyAnswer({
              surveyId: survey._id,
              respondent: {
                userId: user._id,
                demographic: {
                  gender: Math.random() > 0.5 ? 'male' : 'female',
                dateOfBirth: generateRandomBirthDate(),
                  educationLevel: ['High School', 'Bachelor', 'Master', 'Doctorate'][Math.floor(Math.random() * 4)],
                  city: ['Ashdod', 'Tel Aviv', 'Jerusalem', 'Haifa', 'Netanya', 'Beer Sheva'][Math.floor(Math.random() * 6)]
                }
              },
              answers,
              path,
            submittedAt: initialTimestamp,
            completionStatus: isComplete ? 'completed' : 'partial'
            });

          // Enregistrer la réponse
            await surveyAnswer.save();
          
          // Afficher le chemin pour débogage
          console.log(`Chemin généré pour l'utilisateur ${user.username}, sondage ${survey.title}:`);
          console.log(JSON.stringify(fullPath, null, 2));
          
          continue; // Passer au sondage suivant
        }
        
        // Trouver le nœud cible de la première arête
        const secondNode = nodesMap[firstEdge.target];
        if (!secondNode) {
          continue; // Passer au sondage suivant si le nœud n'existe pas
        }
        
        // Marquer le deuxième nœud comme visité
        visitedNodes.add(secondNode.id);
        
        // Générer une réponse pour le deuxième nœud
        let secondNodeAnswer;
        switch (secondNode.data.type) {
          case 'text':
            secondNodeAnswer = `Response from ${user.username} to "${secondNode.data.text}"`;
            break;
          case 'dropdown':
            if (secondNode.data.options && secondNode.data.options.length > 0) {
              secondNodeAnswer = secondNode.data.options[Math.floor(Math.random() * secondNode.data.options.length)];
          } else {
              secondNodeAnswer = "Default option";
            }
            break;
          case 'yes-no':
            secondNodeAnswer = isCriticalAnswerYes ? 'Yes' : 'No';
            break;
          case 'rating':
            secondNodeAnswer = Math.floor(Math.random() * 5) + 1;
            break;
          case 'slider':
            // Pour les questions avec échelle de 1 à 10
            if (secondNode.data.text && (secondNode.data.text.includes("technical expertise") || 
                secondNode.data.text.includes("satisfaction level"))) {
              // Générer un nombre entier entre 1 et 10
              secondNodeAnswer = Math.floor(Math.random() * 10) + 1;
              // Convertir en chaîne pour être sûr
              secondNodeAnswer = secondNodeAnswer.toString();
              
              if (secondNode.data.text.includes("technical expertise")) {
                console.log(`Réponse d'expertise technique générée (secondNode): ${secondNodeAnswer}`);
              } else if (secondNode.data.text.includes("satisfaction level")) {
                console.log(`Réponse de satisfaction générée (secondNode): ${secondNodeAnswer}`);
              }
            } else {
              secondNodeAnswer = Math.floor(Math.random() * 10) + 1;
            }
            break;
          case 'date':
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 365));
            secondNodeAnswer = date.toISOString().split('T')[0];
            break;
          default:
            secondNodeAnswer = `Standard response to the question ${secondNode.id}`;
        }
        
        // Ajouter la réponse au deuxième nœud
        const secondAnswerTimestamp = new Date(initialTimestamp);
        secondAnswerTimestamp.setSeconds(secondAnswerTimestamp.getSeconds() + 30);
        
        if (secondNode.data.text && (secondNode.data.text.includes("technical expertise") || 
            secondNode.data.text.includes("satisfaction level"))) {
          // Pour les questions avec échelle de 1 à 10
          const numAnswer = Math.floor(Math.random() * 10) + 1;
          
          if (secondNode.data.text.includes("technical expertise")) {
            console.log(`Question d'expertise technique (answers): réponse finale = ${numAnswer}`);
          } else if (secondNode.data.text.includes("satisfaction level")) {
            console.log(`Question de satisfaction (answers): réponse finale = ${numAnswer}`);
          }
          
          answers.push({
            nodeId: secondNode.id,
            answer: numAnswer.toString(),
            answeredAt: new Date(secondAnswerTimestamp)
          });
        } else {
          answers.push({
            nodeId: secondNode.id,
            answer: secondNodeAnswer,
            answeredAt: new Date(secondAnswerTimestamp)
          });
        }
        
        // Ajouter le deuxième nœud au chemin
        const secondPathTimestamp = new Date(initialTimestamp);
        secondPathTimestamp.setSeconds(secondPathTimestamp.getSeconds() + 30);
        
        path.push({
          nodeId: secondNode.id,
          timestamp: new Date(secondPathTimestamp)
        });
        
        // Ajouter le deuxième segment au chemin complet
        if (secondNode.data.text && (secondNode.data.text.includes("technical expertise") || 
            secondNode.data.text.includes("satisfaction level"))) {
          // Pour les questions avec échelle de 1 à 10
          const numAnswer = Math.floor(Math.random() * 10) + 1;
          
          if (secondNode.data.text.includes("technical expertise")) {
            console.log(`Question d'expertise technique (fullPath): réponse finale = ${numAnswer}`);
          } else if (secondNode.data.text.includes("satisfaction level")) {
            console.log(`Question de satisfaction (fullPath): réponse finale = ${numAnswer}`);
          }
          
          fullPath.push({
            questionId: secondNode.id,
            questionText: secondNode.data.text,
            answer: numAnswer.toString()
          });
        } else {
          fullPath.push({
            questionId: secondNode.id,
            questionText: secondNode.data.text,
            answer: secondNodeAnswer
          });
        }
        
        // Continuer le chemin à partir du deuxième nœud
        const pathComplete = followPath(secondNode.id, 1);
        
        // Créer et enregistrer la réponse
        const submittedTimestamp = new Date(initialTimestamp);
        submittedTimestamp.setSeconds(submittedTimestamp.getSeconds() + 30 * answers.length + 10);
        
        const surveyAnswer = new DynamicSurveyAnswer({
          surveyId: survey._id,
          respondent: {
            userId: user._id,
            demographic: {
              gender: Math.random() > 0.5 ? 'male' : 'female',
              dateOfBirth: generateRandomBirthDate(),
              educationLevel: ['High School', 'Bachelor', 'Master', 'Doctorate'][Math.floor(Math.random() * 4)],
              city: ['Ashdod', 'Tel Aviv', 'Jerusalem', 'Haifa', 'Netanya', 'Beer Sheva'][Math.floor(Math.random() * 6)]
            }
          },
          answers,
          path,
          submittedAt: submittedTimestamp,
          completionStatus: pathComplete ? 'completed' : 'partial'
        });
        
        // Enregistrer la réponse
        await surveyAnswer.save();
        
        // Afficher le chemin pour débogage
        console.log(`Path generated for the user ${user.username}, survey ${survey.title}:`);
        console.log(JSON.stringify(fullPath, null, 2));
        
        // Vérifier si le chemin contient la question d'expertise technique
        const expertiseQuestion = fullPath.find(item => item.questionText && item.questionText.includes("technical expertise"));
        if (expertiseQuestion) {
          console.log(`Question d'expertise technique trouvée dans le chemin: ${expertiseQuestion.questionId}`);
          console.log(`Réponse: ${expertiseQuestion.answer}`);
        } else {
          console.log("Aucune question d'expertise technique dans ce chemin");
        }
      }
    }
  }
};

// Fonction principale
const generateTestData = async () => {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Générer 100 utilisateurs
    console.log('Generating users...');
    const users = await generateRandomUsers(100);
    console.log(`${users.length} users generated`);

    // Créer un utilisateur admin pour les sondages
    const adminUser = users[0];

    // Créer les sondages
    console.log('Creating surveys...');
    const publicStaticSurvey = await createPublicStaticSurvey(adminUser._id);
    const privateStaticSurvey = await createPrivateStaticSurvey(adminUser._id);
    const publicDynamicSurvey = await createPublicDynamicSurvey(adminUser._id);
    const privateDynamicSurvey = await createPrivateDynamicSurvey(adminUser._id);

    // Générer les réponses
    console.log('Generating answers...');
    await generateRandomAnswers(users, [
      publicStaticSurvey,
      privateStaticSurvey,
      publicDynamicSurvey,
      privateDynamicSurvey
    ]);

    console.log('Test data generated successfully !');
    console.log('Test credentials : email = test1@example.com, password = Password123');
    process.exit(0);
  } catch (error) {
    console.error('Error generating test data:', error);
    process.exit(1);
  }
};

// Exécuter le script
generateTestData(); 