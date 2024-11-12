document.addEventListener('DOMContentLoaded', function() {
    const secretIngredients = {
        'Technical Lead': 'Aged Code Base',
        'Senior Software Engineer': 'Refined Algorithm Extract',
        'Ledger': 'Blockchain Reduction',
        'Louis Vuitton': 'Luxury Interface Zest',
        'CAP Cuisine': 'Culinary Wisdom Essence',
        'École La Source': 'Parisian Technique Infusion',
        'Computer Science': 'Binary Logic Crystals',
        '42 School': 'Peer Learning Spice',
        'Civil Engineering': 'Structural Foundation Powder'
    };

    function generateMarmitonRecipe() {
        const recipeName = "Carrière à la Malik";
        const prepTime = "7 ans";
        const cookTime = "En cours";
        const difficulty = "Difficile";
        const servings = "1 carrière réussie";
        let ingredients = Object.values(secretIngredients).map(ingredient => `
            <li>
                <label>
                    <input type="checkbox">
                    <span class="ingredient-text">${ingredient}</span>
                </label>
            </li>
        `).join('');
        let steps = [
            "Commencez par mélanger le Structural Foundation Powder avec les Binary Logic Crystals pour créer une base solide.",
            "Incorporez progressivement le Peer Learning Spice, en veillant à bien l'intégrer à la préparation.",
            "Dans une grande marmite, faites réduire le Blockchain Reduction jusqu'à obtenir une consistance sécurisée.",
            "Ajoutez l'Aged Code Base et le Refined Algorithm Extract, en remuant constamment pour éviter les bugs.",
            "Parfumez le mélange avec une pincée de Luxury Interface Zest pour une touche d'élégance.",
            "Laissez mijoter le tout pendant plusieurs années, en ajoutant régulièrement du Culinary Wisdom Essence.",
            "Pour finir, nappez généreusement de Parisian Technique Infusion et laissez reposer jusqu'à maturation parfaite."
        ].map((step, index) => `
            <li>${step}</li>
        `).join('');
        return `
            <div id="marmiton-recipe" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #fff;">
                <h1 style="color: #fa6e0a;">${recipeName}</h1>
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <div>
                        <p><strong>Temps de préparation :</strong> ${prepTime}</p>
                        <p><strong>Temps de cuisson :</strong> ${cookTime}</p>
                    </div>
                    <div>
                        <p><strong>Difficulté :</strong> ${difficulty}</p>
                        <p><strong>Pour :</strong> ${servings}</p>
                    </div>
                </div>
                <h2 style="color: #fa6e0a;">Ingrédients</h2>
                <ul style="list-style-type: none; padding: 0;">
                    ${ingredients}
                </ul>
                <h2 style="color: #fa6e0a;">Préparation</h2>
                <ol>
                    ${steps}
                </ol>
                <button id="closeRecipe" style="background-color: #fa6e0a; color: white; border: none; padding: 10px 20px; cursor: pointer; margin-top: 20px;">Fermer la recette</button>
            </div>
        `;
    }

    function activateEasterEgg() {
        const recipeHtml = generateMarmitonRecipe();
        
        const recipeView = document.createElement('div');
        recipeView.style.position = 'fixed';
        recipeView.style.top = '0';
        recipeView.style.left = '0';
        recipeView.style.width = '100%';
        recipeView.style.height = '100%';
        recipeView.style.backgroundColor = '#f2f2f2';
        recipeView.style.overflowY = 'scroll';
        recipeView.style.zIndex = '1000';
        
        recipeView.innerHTML = recipeHtml;
        
        document.body.appendChild(recipeView);
        
        document.getElementById('closeRecipe').addEventListener('click', () => {
            document.body.removeChild(recipeView);
        });
    }

    // Activate easter egg on double-click of name
    const nameElement = document.querySelector('h1');
    if (nameElement) {
        nameElement.addEventListener('dblclick', activateEasterEgg);
    } else {
        console.error('Could not find h1 element for easter egg activation');
    }
});