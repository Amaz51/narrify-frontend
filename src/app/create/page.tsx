"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { WizardContainer } from "@/components/wizard/WizardContainer";

export default function CreateAudiobookPage() {
    return (
        <MainLayout>
            <div className="py-8">
                <WizardContainer />
            </div>
        </MainLayout>
    );
}
