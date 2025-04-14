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
  for (let i = 0; i < count; i++) {
    const username = `testUser${i + 1}`;
    const email = `test${i + 1}@example.com`;
    const password = await bcrypt.hash('password123', 10);
    
    const user = new User({
      username,
      email,
      password,
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
    title: "Sondage Public Statique - Test",
    description: "Ce sondage contient tous les types de questions disponibles",
    isPrivate: false,
    demographicEnabled: true,
    questions: [
      {
        id: "q1",
        type: "multiple-choice",
        text: "Quelle est votre couleur préférée ?",
        options: ["Rouge", "Bleu", "Vert", "Jaune"]
      },
      {
        id: "q2",
        type: "text",
        text: "Décrivez votre journée idéale"
      },
      {
        id: "q3",
        type: "dropdown",
        text: "Quel est votre niveau d'éducation ?",
        options: ["Baccalauréat", "Master", "Doctorat"]
      },
      {
        id: "q4",
        type: "yes-no",
        text: "Aimez-vous les sondages ?"
      },
      {
        id: "q5",
        type: "slider",
        text: "Notez votre satisfaction générale (1-10)"
      },
      {
        id: "q6",
        type: "rating",
        text: "Évaluez notre service"
      },
      {
        id: "q7",
        type: "date",
        text: "Quelle est votre date de naissance ?"
      },
      {
        id: "q8",
        type: "color-picker",
        text: "Choisissez votre couleur préférée"
      }
    ],
    userId
  });
  
  return await survey.save();
};

// Fonction pour générer un sondage statique privé
const createPrivateStaticSurvey = async (userId) => {
  const survey = new Survey({
    title: "Sondage Privé Statique - Test",
    description: "Ce sondage privé contient tous les types de questions disponibles",
    isPrivate: true,
    demographicEnabled: true,
    questions: [
      {
        id: "q1",
        type: "multiple-choice",
        text: "Quel est votre plat préféré ?",
        options: ["Pizza", "Sushi", "Pâtes", "Salade"]
      },
      {
        id: "q2",
        type: "text",
        text: "Quelle est votre plus grande réussite ?"
      },
      {
        id: "q3",
        type: "dropdown",
        text: "Quel est votre sport préféré ?",
        options: ["Football", "Tennis", "Natation", "Course"]
      },
      {
        id: "q4",
        type: "yes-no",
        text: "Pratiquez-vous un sport régulièrement ?"
      },
      {
        id: "q5",
        type: "slider",
        text: "Quelle est votre motivation pour le sport (1-10) ?"
      },
      {
        id: "q6",
        type: "rating",
        text: "Évaluez votre condition physique"
      },
      {
        id: "q7",
        type: "date",
        text: "Quand avez-vous commencé à faire du sport ?"
      },
      {
        id: "q8",
        type: "color-picker",
        text: "Quelle couleur représente le mieux votre énergie ?"
      }
    ],
    userId
  });
  
  return await survey.save();
};

// Fonction pour générer un sondage dynamique public
const createPublicDynamicSurvey = async (userId) => {
  const survey = new DynamicSurvey({
    title: "Sondage Dynamique Public - Test",
    description: "Ce sondage dynamique contient des questions conditionnelles",
    isPrivate: false,
    demographicEnabled: true,
    nodes: [
      {
        id: "start",
        type: "start",
        data: { text: "Début du sondage" },
        position: { x: 0, y: 0 }
      },
      {
        id: "q1",
        type: "multiple-choice",
        data: {
          text: "Quelle est votre activité préférée ?",
          options: ["Sport", "Lecture", "Musique", "Art"]
        },
        position: { x: 200, y: 0 }
      },
      {
        id: "q2_sport",
        type: "multiple-choice",
        data: {
          text: "Quel sport pratiquez-vous ?",
          options: ["Football", "Tennis", "Natation"]
        },
        position: { x: 400, y: -100 }
      },
      {
        id: "q2_lecture",
        type: "multiple-choice",
        data: {
          text: "Quel genre de livres préférez-vous ?",
          options: ["Roman", "Science-fiction", "Biographie"]
        },
        position: { x: 400, y: 0 }
      },
      {
        id: "q2_musique",
        type: "multiple-choice",
        data: {
          text: "Quel genre de musique écoutez-vous ?",
          options: ["Rock", "Jazz", "Classique"]
        },
        position: { x: 400, y: 100 }
      },
      {
        id: "q2_art",
        type: "multiple-choice",
        data: {
          text: "Quelle forme d'art préférez-vous ?",
          options: ["Peinture", "Sculpture", "Photographie"]
        },
        position: { x: 400, y: 200 }
      },
      {
        id: "q3_critical",
        type: "yes-no",
        data: {
          text: "Cette activité est-elle importante pour votre bien-être ?",
          isCritical: true
        },
        position: { x: 600, y: 0 }
      },
      {
        id: "q4_critical",
        type: "dropdown",
        data: {
          text: "À quelle fréquence pratiquez-vous cette activité ?",
          options: ["Quotidiennement", "Hebdomadairement", "Mensuellement", "Occasionnellement"],
          isCritical: true
        },
        position: { x: 800, y: 0 }
      },
      {
        id: "end",
        type: "end",
        data: { text: "Fin du sondage" },
        position: { x: 1000, y: 0 }
      }
    ],
    edges: [
      { id: "e1", source: "start", target: "q1" },
      { id: "e2_sport", source: "q1", target: "q2_sport", label: "Sport" },
      { id: "e2_lecture", source: "q1", target: "q2_lecture", label: "Lecture" },
      { id: "e2_musique", source: "q1", target: "q2_musique", label: "Musique" },
      { id: "e2_art", source: "q1", target: "q2_art", label: "Art" },
      { id: "e3_sport", source: "q2_sport", target: "q3_critical" },
      { id: "e3_lecture", source: "q2_lecture", target: "q3_critical" },
      { id: "e3_musique", source: "q2_musique", target: "q3_critical" },
      { id: "e3_art", source: "q2_art", target: "q3_critical" },
      { id: "e4", source: "q3_critical", target: "q4_critical" },
      { id: "e5", source: "q4_critical", target: "end" }
    ],
    userId
  });
  
  return await survey.save();
};

// Fonction pour générer un sondage dynamique privé
const createPrivateDynamicSurvey = async (userId) => {
  const survey = new DynamicSurvey({
    title: "Sondage Dynamique Privé - Test",
    description: "Ce sondage dynamique privé contient des questions conditionnelles",
    isPrivate: true,
    demographicEnabled: true,
    nodes: [
      {
        id: "start",
        type: "start",
        data: { text: "Début du sondage" },
        position: { x: 0, y: 0 }
      },
      {
        id: "q1",
        type: "multiple-choice",
        data: {
          text: "Quelle est votre passion principale ?",
          options: ["Technologie", "Nature", "Culture", "Sport"]
        },
        position: { x: 200, y: 0 }
      },
      {
        id: "q2_tech",
        type: "multiple-choice",
        data: {
          text: "Quel domaine technologique vous intéresse le plus ?",
          options: ["Intelligence Artificielle", "Cybersécurité", "Développement Web"]
        },
        position: { x: 400, y: -100 }
      },
      {
        id: "q2_nature",
        type: "multiple-choice",
        data: {
          text: "Quelle activité nature préférez-vous ?",
          options: ["Randonnée", "Jardinage", "Observation des oiseaux"]
        },
        position: { x: 400, y: 0 }
      },
      {
        id: "q2_culture",
        type: "multiple-choice",
        data: {
          text: "Quelle forme d'art vous inspire le plus ?",
          options: ["Cinéma", "Littérature", "Musée"]
        },
        position: { x: 400, y: 100 }
      },
      {
        id: "q2_sport",
        type: "multiple-choice",
        data: {
          text: "Quel type de sport vous motive le plus ?",
          options: ["Collectif", "Individuel", "Extrême"]
        },
        position: { x: 400, y: 200 }
      },
      {
        id: "q3_critical",
        type: "yes-no",
        data: {
          text: "Cette passion influence-t-elle vos choix professionnels ?",
          isCritical: true
        },
        position: { x: 600, y: 0 }
      },
      {
        id: "q4_critical",
        type: "dropdown",
        data: {
          text: "Quelle est l'importance de cette passion dans votre vie ?",
          options: ["Primordiale", "Importante", "Modérée", "Secondaire"],
          isCritical: true
        },
        position: { x: 800, y: 0 }
      },
      {
        id: "end",
        type: "end",
        data: { text: "Fin du sondage" },
        position: { x: 1000, y: 0 }
      }
    ],
    edges: [
      { id: "e1", source: "start", target: "q1" },
      { id: "e2_tech", source: "q1", target: "q2_tech", label: "Technologie" },
      { id: "e2_nature", source: "q1", target: "q2_nature", label: "Nature" },
      { id: "e2_culture", source: "q1", target: "q2_culture", label: "Culture" },
      { id: "e2_sport", source: "q1", target: "q2_sport", label: "Sport" },
      { id: "e3_tech", source: "q2_tech", target: "q3_critical" },
      { id: "e3_nature", source: "q2_nature", target: "q3_critical" },
      { id: "e3_culture", source: "q2_culture", target: "q3_critical" },
      { id: "e3_sport", source: "q2_sport", target: "q3_critical" },
      { id: "e4", source: "q3_critical", target: "q4_critical" },
      { id: "e5", source: "q4_critical", target: "end" }
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

// Fonction pour générer des réponses aléatoires
const generateRandomAnswers = async (users, surveys) => {
  for (const user of users) {
    for (const survey of surveys) {
      // Générer des réponses pour les sondages statiques
      if (survey instanceof Survey) {
        const answers = survey.questions.map(question => {
          let answer;
          switch (question.type) {
            case 'multiple-choice':
            case 'dropdown':
              answer = question.options[Math.floor(Math.random() * question.options.length)];
              break;
            case 'text':
              answer = `Réponse de test pour ${user.username}`;
              break;
            case 'yes-no':
              answer = Math.random() > 0.5 ? 'Oui' : 'Non';
              break;
            case 'slider':
              answer = Math.floor(Math.random() * 10) + 1;
              break;
            case 'rating':
              answer = Math.floor(Math.random() * 5) + 1;
              break;
            case 'date':
              answer = generateRandomBirthDate();
              break;
            case 'color-picker':
              answer = `#${Math.floor(Math.random()*16777215).toString(16)}`;
              break;
          }
          return {
            questionId: question.id,
            answer
          };
        });

        const birthDate = generateRandomBirthDate();
        const surveyAnswer = new SurveyAnswer({
          surveyId: survey._id,
          respondent: {
            userId: user._id,
            demographic: {
              gender: Math.random() > 0.5 ? 'Homme' : 'Femme',
              dateOfBirth: birthDate,
              educationLevel: ['Baccalauréat', 'Master', 'Doctorat'][Math.floor(Math.random() * 3)],
              city: ['Paris', 'Lyon', 'Marseille', 'Bordeaux'][Math.floor(Math.random() * 4)]
            }
          },
          answers
        });

        await surveyAnswer.save();
      }
      // Générer des réponses pour les sondages dynamiques
      else if (survey instanceof DynamicSurvey) {
        const path = [];
        let currentNode = survey.nodes.find(n => n.type === 'start');
        const birthDate = generateRandomBirthDate();
        
        while (currentNode && currentNode.type !== 'end') {
          path.push({
            nodeId: currentNode.id,
            timestamp: new Date()
          });

          if (currentNode.type === 'multiple-choice' || currentNode.type === 'yes-no' || currentNode.type === 'dropdown') {
            let answer;
            if (currentNode.type === 'yes-no') {
              answer = Math.random() > 0.5 ? 'Oui' : 'Non';
            } else {
              answer = currentNode.data.options[Math.floor(Math.random() * currentNode.data.options.length)];
            }

            const answers = [{
              nodeId: currentNode.id,
              answer
            }];

            const surveyAnswer = new DynamicSurveyAnswer({
              surveyId: survey._id,
              respondent: {
                userId: user._id,
                demographic: {
                  gender: Math.random() > 0.5 ? 'Homme' : 'Femme',
                  dateOfBirth: birthDate,
                  educationLevel: ['Baccalauréat', 'Master', 'Doctorat'][Math.floor(Math.random() * 3)],
                  city: ['Paris', 'Lyon', 'Marseille', 'Bordeaux'][Math.floor(Math.random() * 4)]
                }
              },
              answers,
              path,
              completionStatus: 'completed'
            });

            await surveyAnswer.save();
          }

          // Trouver le prochain nœud
          const edge = survey.edges.find(e => e.source === currentNode.id);
          if (edge) {
            currentNode = survey.nodes.find(n => n.id === edge.target);
          } else {
            break;
          }
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
    console.log('Connecté à MongoDB');

    // Générer 50 utilisateurs
    console.log('Génération des utilisateurs...');
    const users = await generateRandomUsers(50);
    console.log(`${users.length} utilisateurs générés`);

    // Créer un utilisateur admin pour les sondages
    const adminUser = users[0];

    // Créer les sondages
    console.log('Création des sondages...');
    const publicStaticSurvey = await createPublicStaticSurvey(adminUser._id);
    const privateStaticSurvey = await createPrivateStaticSurvey(adminUser._id);
    const publicDynamicSurvey = await createPublicDynamicSurvey(adminUser._id);
    const privateDynamicSurvey = await createPrivateDynamicSurvey(adminUser._id);

    // Générer les réponses
    console.log('Génération des réponses...');
    await generateRandomAnswers(users, [
      publicStaticSurvey,
      privateStaticSurvey,
      publicDynamicSurvey,
      privateDynamicSurvey
    ]);

    console.log('Données de test générées avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la génération des données:', error);
    process.exit(1);
  }
};

// Exécuter le script
generateTestData(); 