<template>
  <div class="py-10 md:flex-1 md:pt-32 lg:pt-[200px]">
    <div class="container h-full">
      <div class="flex flex-col h-full md:max-w-[530px] md:mx-auto">
        <div class="flex flex-col items-center mb-20">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 100 100" class="w-[100px] h-[100px] mb-[30px]">
            <g fill="#00D395" clip-path="url(#clip0_356_10275)">
              <path
                d="M44.417 66.667a3.09 3.09 0 0 1-2.209-.917L31.75 55.333a3.144 3.144 0 0 1 0-4.416 3.144 3.144 0 0 1 4.417 0l8.25 8.208 20.75-20.75a3.144 3.144 0 0 1 4.416 0 3.144 3.144 0 0 1 0 4.417L46.625 65.75a3.09 3.09 0 0 1-2.208.917Z"
              />
              <path
                d="M49.957 91.666c-10.75 0-20.917-4.041-28.708-11.5C13.207 72.5 8.624 62.126 8.332 51 7.79 28.04 26.04 8.917 49 8.333c11.125-.25 21.708 3.792 29.75 11.5C86.79 27.5 91.374 37.875 91.665 49c.25 11.125-3.791 21.708-11.5 29.75C72.5 86.79 62.124 91.375 51 91.666h-1.042Zm.083-77.083h-.875c-19.541.458-35.041 16.75-34.541 36.25.208 9.459 4.125 18.25 10.958 24.792 6.833 6.541 15.792 10 25.292 9.75 9.458-.209 18.25-4.125 24.791-10.959 6.542-6.833 10-15.833 9.75-25.291-.208-9.459-4.125-18.25-10.958-24.792-6.667-6.291-15.292-9.75-24.417-9.75Z"
              />
            </g>
            <defs>
              <clipPath id="clip0_356_10275">
                <path fill="#fff" d="M0 0h100v100H0z" />
              </clipPath>
            </defs>
          </svg>
          <div class="text-xl font-medium mb-[30px]">Welcome to Demo</div>
          <div class="flex items-center border border-orange bg-orange-500/20 px-5 py-[15px] rounded-md">
            <TriangleIcon class="w-[42px] h-[42px] text-orange-500 flex-shrink-0 mr-5" />
            <div class="text-sm text-center">
              To activate your account, please verify your email address by clicking on the confirmation link we've sent to your email.
            </div>
          </div>
        </div>
        <div class="mt-auto mb-[90px]">
          <div class="flex items-center justify-center gap-2.5">
            <NuxtLink to="/" class="flex items-center justify-center rounded w-[170px] px-5 py-2 text-blue-500 border border-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-6 h-6 mr-2">
                <path
                  fill="#007FFF"
                  d="M22.816 10.559a.92.92 0 0 1 .109 1.301.93.93 0 0 1-1.308.108l-.948-.8v8.037a3.087 3.087 0 0 1-3.095 3.08H6.43a3.088 3.088 0 0 1-3.095-3.08v-8.038l-.947.801a.931.931 0 0 1-1.31-.108.92.92 0 0 1 .108-1.301l10.216-8.625a.93.93 0 0 1 1.199 0l10.214 8.625ZM6.431 20.438h1.857v-5.853c0-.851.693-1.54 1.548-1.54h4.333c.855 0 1.548.689 1.548 1.54v5.853h1.857c.685 0 1.238-.551 1.238-1.233V9.6l-6.81-5.75-6.81 5.75v9.605c0 .682.554 1.233 1.239 1.233Zm3.714 0h3.715v-5.545h-3.715v5.545Z"
                />
              </svg>
              <span class="text-sm font-medium">Home</span>
            </NuxtLink>
            <NuxtLink
              :to="{
                path: '/',
                query: {
                  signin: 'true',
                },
              }"
              class="flex items-center justify-center rounded w-[170px] px-5 py-2 text-white border border-blue-500 bg-blue-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-6 h-6 mr-2">
                <path
                  fill="#fff"
                  d="M21.018 4.5 12.79 1.017a2.445 2.445 0 0 0-.788-.16c-.227 0-.583.072-.793.16L2.98 4.5a2.073 2.073 0 0 0-1.27 1.89c0 11.234 8.11 16.753 10.248 16.753 2.229 0 10.324-5.58 10.324-16.754 0-.805-.501-1.568-1.264-1.89Zm-9.017-1.552s.004 0 0 0Zm-.043 18.105c-3.926-1.675-8.187-6.968-8.187-14.62 0-.002 0 .002 0 0l8.177-3.467c.014-.004.032-.013.054-.017l8.223 3.44c0 8.854-5.383 13.459-8.267 14.664ZM9.597 9.911c0 .97.562 1.802 1.371 2.194v3.029c0 .579.463 1.044 1.029 1.044.565 0 1.028-.468 1.028-1.044v-3.03a2.434 2.434 0 0 0 1.372-2.194c0-1.346-1.075-2.437-2.4-2.437-1.326 0-2.4 1.093-2.4 2.438Z"
                />
              </svg>
              <span class="text-sm font-medium">Sign In</span>
            </NuxtLink>
          </div>
        </div>
        <div class="text-xs text-center text-muted-foreground">
          For assistance please contact
          <a href="mailto:support@demo.app" class="text-blue-500">support@demo.app</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TriangleIcon from '@/assets/icons/triangle.svg';
</script>
