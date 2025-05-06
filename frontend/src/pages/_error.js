"use client";

function Error({ statusCode }) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      flexDirection: 'column' 
    }}>
      <h1>
        {statusCode
          ? `Une erreur ${statusCode} s'est produite`
          : 'Une erreur s\'est produite côté client'}
      </h1>
      <p>Veuillez réessayer ou contacter l'administrateur.</p>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error; 