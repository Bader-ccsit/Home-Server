import React, { createContext, useContext, useEffect, useState } from 'react'

const translations: Record<string, Record<string, string>> = {
  en: {
    signIn: 'Sign in',
    signUp: 'Sign up',
    username: 'Username',
    email: 'Email',
    password: 'Password',
    createAccount: 'Create account',
    forgotPassword: 'Forgot password?',
    emailOrUsername: 'Email or Username',
    sendOtp: 'Send OTP',
    otp: 'OTP',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    resetPassword: 'Reset password',
    activationTitle: 'Activate your account',
    activationButton: 'Activate',
    resendOtp: 'Resend OTP',
    passwordReq: 'Password must be at least 6 characters and contain a number or special character.',
    homeTitle: 'My Home Server',
    myHome: 'My Home',
    welcomeBack: 'Welcome back',
    logout: 'Logout',
    language: 'Language',
    theme: 'Theme',
    drivePrevious: 'Previous',
    driveNext: 'Next',
    driveUp: 'Up',
    driveRelativePath: 'Relative Path',
    drivePathPlaceholder: 'e.g. docs/photos',
    driveGo: 'Go',
    driveSearch: 'Search',
    driveNewFolder: 'New Folder',
    driveCurrentRelativePath: 'Current relative path:',
    driveExactUrl: 'Exact URL:',
    driveDropToParent: 'Drop here to move item to parent folder:',
    driveDropZoneText: 'Drag files here to upload, or drag an item here to move it into',
    driveBrowseFiles: 'Browse files',
    driveLoading: 'Loading...',
    driveName: 'Name',
    driveSize: 'Size',
    driveModified: 'Modified',
    driveDownload: 'Download',
    drivePreview: 'Preview',
    driveRename: 'Rename',
    driveDelete: 'Delete',
    driveFolderNamePrompt: 'Folder name',
    driveDeleteConfirm: 'Delete?',
    driveNewNamePrompt: 'New name',
    driveMoveIntoSelf: 'Cannot move a folder into itself',
    driveDownloadFailed: 'Download failed',
    drivePreviewFailed: 'Preview failed',
    drivePopupBlocked: 'Popup blocked. Please allow popups for preview.',
    driveRoot: 'root',
  },
  ar: {
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    username: 'اسم المستخدم',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    createAccount: 'إنشاء حساب',
    forgotPassword: 'نسيت كلمة المرور؟',
    emailOrUsername: 'البريد أو اسم المستخدم',
    sendOtp: 'إرسال رمز',
    otp: 'الرمز',
    newPassword: 'كلمة المرور الجديدة',
    confirmPassword: 'تأكيد كلمة المرور',
    resetPassword: 'إعادة تعيين كلمة المرور',
    activationTitle: 'تفعيل حسابك',
    activationButton: 'تفعيل',
    resendOtp: 'إعادة إرسال الرمز',
    passwordReq: 'يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل ورقم واحد أو رمز خاص.',
    homeTitle: 'خادمي المنزلي',
    myHome: 'الرئيسية',
    welcomeBack: 'مرحباً بعودتك',
    logout: 'تسجيل خروج',
    language: 'اللغة',
    theme: 'السمة',
    drivePrevious: 'السابق',
    driveNext: 'التالي',
    driveUp: 'للأعلى',
    driveRelativePath: 'المسار النسبي',
    drivePathPlaceholder: 'مثال: docs/photos',
    driveGo: 'انتقال',
    driveSearch: 'بحث',
    driveNewFolder: 'مجلد جديد',
    driveCurrentRelativePath: 'المسار النسبي الحالي:',
    driveExactUrl: 'الرابط الكامل:',
    driveDropToParent: 'أسقط هنا لنقل العنصر إلى المجلد الأعلى:',
    driveDropZoneText: 'اسحب الملفات هنا للرفع، أو اسحب عنصراً هنا لنقله إلى',
    driveBrowseFiles: 'تصفح الملفات',
    driveLoading: 'جارٍ التحميل...',
    driveName: 'الاسم',
    driveSize: 'الحجم',
    driveModified: 'آخر تعديل',
    driveDownload: 'تنزيل',
    drivePreview: 'معاينة',
    driveRename: 'إعادة تسمية',
    driveDelete: 'حذف',
    driveFolderNamePrompt: 'اسم المجلد',
    driveDeleteConfirm: 'هل تريد الحذف؟',
    driveNewNamePrompt: 'الاسم الجديد',
    driveMoveIntoSelf: 'لا يمكن نقل مجلد داخل نفسه',
    driveDownloadFailed: 'فشل التنزيل',
    drivePreviewFailed: 'فشلت المعاينة',
    drivePopupBlocked: 'تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة للمعاينة.',
    driveRoot: 'الجذر',
  }
}

const I18nContext = createContext<any>(null)

export function I18nProvider({ children }: any) {
  const [lang, setLang] = useState<string>(() => localStorage.getItem('lang') || 'en')

  useEffect(() => {
    localStorage.setItem('lang', lang)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  function t(key: string) {
    return translations[lang]?.[key] ?? key
  }

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)

export default I18nContext
