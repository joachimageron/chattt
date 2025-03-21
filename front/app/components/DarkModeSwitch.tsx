"use client";
import {SunIcon} from "@/app/components/icons/SunIcon";
import {MoonIcon} from "@/app/components/icons/MoonIcon";
import {Switch} from "@heroui/switch";
import {useEffect, useState} from "react";



export default function DarkModeSwitch() {
  const [isSelected, setIsSelected] = useState(true);
  
  useEffect(() => {
    if (isSelected) {
      document.documentElement.classList.remove("dark")
    } else {
      document.documentElement.classList.add("dark")
    }
  }, [isSelected])
  
  const handleDarkMode = async () => {
    setIsSelected(!isSelected)
  }
  
  return (
    <Switch
      isSelected={isSelected} onValueChange={handleDarkMode}
      className={"flex items-center justify-center"}
      defaultSelected
      size="sm"
      color="warning"
      thumbIcon={
        isSelected ? (
          <SunIcon />
        ) : (
          <MoonIcon/>
        )
      }
    />
  )
}