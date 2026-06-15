# Description

On va faire un package npm de tuto/onboard framework agnostic 
Avec un package pour React, Angular, Vue et en Vanilla.

Chaque état dynamique et "écoutable" doit être géré par @glowhop/observables

# Decisions validees

- L'API publique principale expose un objet `glowTour`.
- `glowTour` fournit des utilitaires, la creation de workflow avec `glowTour.create(...)`, le lancement avec `glowTour.run(...)`, et un acces au store avec `glowTour.state`.
- `glowTour.run(workflow)` delegue au store.
- Le store doit utiliser le package `@glowhop/observables` directement. Ne pas reimplementer un systeme pub/sub local a la place.
- Le builder n'utilise pas `id` pour les steps. Une step utilise uniquement `target`, qui est un query selector.
- Les options de step (`overlay`, `popover`, `scroll`, `animation`, `behavior` / `missingTargetStrategy`) vivent au niveau de la step.
- Les callbacks `onStart`, `onCancel`, `onFinish` sont definies dans les `startProps` et ne recoivent aucun argument.
- La compatibilite SSR est ignoree pour le moment.
- Angular doit avoir un wrapper leger reel en v1 avec `GlowTourService` et les composants `GlowTourRoot`, `GlowTourHeader`, etc.
- `AnimationOptions` contient uniquement `{ duration, easing }`.
- Pour `missingTargetStrategy: "wait"`, le timeout par defaut est `3000`.
- Pour `missingTargetStrategy: "skip"`, on saute automatiquement a l'etape suivante.
- Les boutons par defaut des triggers vides doivent etre configurables via les props `nextLabel` et `previousLabel`.
- La methode d'arret du store s'appelle `cancel()`, pas `stop()`.

# Le builder 

Pour construire le workflow on utilise le Builder pattern cf : packages/core/src/builder/index.ts
- on va ajouter `glowTour.create(name: string, startProps)`

```ts

const workflow = glowTour.create("test", { overlay:{color: "red"} })
  .step({
    target: "#question-bipolar-fancy.score.expanded",
    title:"",
    content:""
  })
  .onPrevious(() => {
    setTimeout(() => {
      const closeBtn = document.querySelector<HTMLButtonElement>(selector("dialog.close"));
      if (closeBtn) closeBtn.click();
    }, 500);
  })
  .step({
    target: "#question-bipolar-fancy.expanded-modes.comments",
    title: "",
    content: "",
  })
  .clickTarget()
  .step({
    target: "#comments-or-words.display-mode.analysis",
    title: "",
    content: "",
  }).finish()

```


# Le store 
Chaque état dynamique et "écoutable" doit être géré par @glowhop/observables

Celui qui gère tous les états du tuto est un store 

les états dynamiques (@glowhop/observables) : 
status: "idle" | "starting" | "running" | "paused" | "finished" | "cancelled" | "error"
currentStepIndex
currentStep
direction: "next" | "previous"
canGoNext
canGoPrevious
isFirstStep
isLastStep

les états statiques

workflow
error

détient la liste des étapes 
à une callback onStart, onCancel, onFinish
à les fonctions suivantes :
- getWorkflow()
- cancel()
- start(workflow: WorkflowDefinition)
- next()
- previous()

`glowTour.state` donne acces au store.
`glowTour.run(workflow)` delegue a `store.start(workflow)`.

# Fonctionnement

le tuto suit les étapes. si lors d'une passage à une étape, le composant (target) n'est pas apparu, on se fie à missingTargetStrategy (défault error) 

`target` est obligatoire et correspond a un query selector.
Il n'y a pas de `id` de step.

`missingTargetStrategy` :
- `"error"` est la valeur par defaut.
- `"wait"` attend jusqu'au timeout configure, avec `3000` par defaut.
- `"skip"` saute automatiquement a l'etape suivante.

# Composants

Chaque composant est un web-composant qui anglobe son métier
/components/
 popover/ 
    service.ts
    render.ts
    ...etc
 overlay/ 
    service.ts
    render.ts
    ...etc

les services sont autonomes et s'occupe de gérer le composant en écoutant le store

## Popover

Est composé de plusieurs web-components
<glow-tour-root>
    <glow-tour-header class="" />
    <glow-tour-progress class="" />
    <glow-tour-content class="" />
    <glow-tour-footer class="">
         <glow-tour-previous-trigger >
            <button>prev</button> (implémenter par le dev)
        </glow-tour-previous-trigger >
        <glow-tour-next-trigger>
            <button>next</button> (implémenter par le dev)
        </glow-tour-next-trigger >
    </glow-tour-footer>
<glow-tour-root>

Chaque composant s'auto gère avec son propre service. le placement se fait de manière intelligente en fonction du view-port et de la taille de la popover. la props (optionnelle) placementTryOrder donne l'ordre de placement à esssayer

## Overlay 
Inspiration https://github.com/nilbuild/driver.js
Est un web-component svg 

<glow-tour-overlay > = <svg><path /></svg>

il permet de faire le backdrop + le trou.
Il est intéractif ou non
On peut changer la couleur et régler son affichage depuis StepPresentation (ajouter ce fonctionnement)

Si l'étape est interactif il faut ajouter un ☝️ qui pointe vers le composant avec une animation lente
Le placement du smiley et son sens se fait intelligemment en fonction du view-port est de la popover en sachant que la props (optionnelle) interactionIndicatorPlacementTryOrder donne l'ordre de placement à esssayer

## Animations 

Par défaut tout est animé. On disable l'animation si reduce-motion
enter : fade-in
exit : fade-in
move : transition / mouvement 

`AnimationOptions` contient uniquement `{ duration, easing }`.

utilise une méthode d'animation avec requestAnimationFrame, modifie la valeur avec du js progressivement. 
Une animation s'adapte. ex : si on une prop doit aller vers une valeur mais que pendant l'animation, la valeur de fin change, alors on ne reset pas l'animation, on adapte l'animation. 

* JS/RAF pour overlay path, position, dimensions
* CSS pour fade, opacity, transform de la popover
* respect automatique de prefers-reduced-motion

refère toi à AnimationOptions

# Autres informations 
J'ai modifié packages/core/src/builder/index.ts, adapte le code
web components auto-register 

les packages expose : 
le builder 
le store
tous les types utiles

essaye de ne pas être en conflit avec le systeme de SSR
=> ignore pour le moment

les web-components sont montés au lancement et le container est body ou container si la valeur est précisé dans les startProps

# utilisation 

wrappers légers en v1. les triggers peuvent être vide, dans ce cas, on monte nos boutons
Les boutons montes par defaut doivent etre configurables via les props `nextLabel` et `previousLabel`.

## en React 

```tsx
import { glowTour, GlowTour } from "@glowhop/react-tour"

const tour =  glowTour.create("test", { overlay: { color: "red" } }).step({
    target: "#react-tour-id"
    title:"Hello",
    content:"word"
}).finish()


glowTour.run(tour)

return (
    <div>
        <span id="react-tour-id" >AHHH</span>

        <GlowTour.Root>
            <GlowTour.Header className="" />
            <GlowTour.Content className="" />
            <GlowTour.Footer>
                <GlowTour.PreviousTrigger>
                    <button>prev</button> (implémenter optionnellement par le dev, si vide alors on monte nous mêmes un bouton)
                </GlowTour.PreviousTrigger >
                <GlowTour.NextTrigger>
                    <button>next</button> (implémenter optionnellement par le dev, si vide alors on monte nous mêmes un bouton)
                </GlowTour.NextTrigger >
            </GlowTour.Footer>
        </GlowTour.Root>
    </div>
)

```

## en VueJS

```vue 

<script setup lang="ts">
import {
  glowTour,
  GlowTourRoot,
  GlowTourHeader,
  GlowTourContent,
  GlowTourFooter,
  GlowTourPreviousTrigger,
  GlowTourNextTrigger,
} from "@glowhop/vue-tour";

const tour = glowTour
  .create("test", { overlay: { color: "red" } })
  .step({
    target: "#vue-tour-id",
    title: "Hello",
    content: "world",
  })
  .finish();

function startTour() {
  glowTour.run(tour);
}
</script>

<template>
  <div>
    <span id="vue-tour-id">AHHH</span>

    <button @click="startTour">
      Start tour
    </button>

    <GlowTourRoot>
      <GlowTourHeader class="" />
      <GlowTourContent class="" />

      <GlowTourFooter>
        <GlowTourPreviousTrigger>
          <button>prev</button>
        </GlowTourPreviousTrigger>

        <GlowTourNextTrigger>
          <button>next</button>
        </GlowTourNextTrigger>
      </GlowTourFooter>
    </GlowTourRoot>
  </div>
</template>
```

## en Angular

Wrapper leger reel en v1 avec `GlowTourService` et les composants `GlowTourRoot`, `GlowTourHeader`, etc.
