<template>
    <div class="flex">
        <i class="flex place-items-center place-content-center w-10 h-10 border border-slate-300 text-slate-300 rounded-md">
            <slot name="icon"></slot>
        </i>
        <div class="flex place-items-center text-slate-300 ml-5">
            <h3>
                <slot name="heading"></slot>
            </h3>
            <slot></slot>
        </div>
    </div>
</template>
