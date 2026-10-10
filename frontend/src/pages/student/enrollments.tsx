import { useState } from "react";
import { ArrowRightLeft, PlusCircle } from "lucide-react";

import { ConfirmDeleteButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/lib/auth-store";
import { useEnrollmentStore } from "@/lib/enrollment-store";
import type { Course, Enrollment } from "@/lib/types";

type EnrollmentActionsProps = {
  enrollment: Enrollment;
  courses: Course[];
  enrollments: Enrollment[];
  onUpdate: (newCourseId: string) => Promise<void>;
  onDrop: () => Promise<void>;
};

function EnrollmentActions({
  enrollment,
  courses,
  enrollments,
  onUpdate,
  onDrop,
}: EnrollmentActionsProps) {
  const [open, setOpen] = useState(false);
  const [newCourseId, setNewCourseId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const availableCourses = courses.filter(
    (course) =>
      course.courseId !== enrollment.courseId &&
      !enrollments.some(
        (item) =>
          item.studentId === enrollment.studentId &&
          item.courseId === course.courseId,
      ),
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setNewCourseId(null);
      setUpdateError(null);
    }
  };

  const handleUpdate = async () => {
    if (!newCourseId) return;
    setSubmitting(true);
    setUpdateError(null);
    try {
      await onUpdate(newCourseId);
      handleOpenChange(false);
    } catch (err) {
      setUpdateError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-end">
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={`เปลี่ยนวิชา ${enrollment.courseId}`}
            />
          }
        >
          <ArrowRightLeft className="h-4 w-4" />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เปลี่ยนวิชา {enrollment.courseId}</DialogTitle>
            <DialogDescription>
              เลือกวิชาใหม่แทนวิชา {enrollment.courseId}
              (เลือกได้เฉพาะวิชาที่ยังไม่ได้ลงทะเบียน)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor={`new-course-${enrollment.courseId}`}>วิชาใหม่</Label>
            <Select
              items={availableCourses.map((course) => ({
                value: course.courseId,
                label: `${course.courseId} — ${course.courseTitle}`,
              }))}
              value={newCourseId}
              onValueChange={(value) => {
                setNewCourseId(typeof value === "string" ? value : null);
                setUpdateError(null);
              }}
            >
              <SelectTrigger
                id={`new-course-${enrollment.courseId}`}
                className="w-full"
              >
                <SelectValue
                  placeholder={
                    availableCourses.length
                      ? "เลือกวิชา"
                      : "ไม่มีวิชาใหม่ให้เลือก"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableCourses.map((course) => (
                  <SelectItem key={course.courseId} value={course.courseId}>
                    {course.courseId} — {course.courseTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {updateError && (
            <p className="text-sm text-destructive">{updateError}</p>
          )}
          <DialogFooter>
            <Button
              disabled={!newCourseId || submitting}
              onClick={handleUpdate}
            >
              <ArrowRightLeft className="h-4 w-4" />
              {submitting ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDeleteButton
        label={`ยกเลิกการลงทะเบียน ${enrollment.courseId}`}
        title={`ยกเลิกการลงทะเบียน ${enrollment.courseId}?`}
        description="การยกเลิกนี้ไม่สามารถย้อนกลับได้"
        onConfirm={onDrop}
      />
    </div>
  );
}

export default function StudentEnrollmentsPage() {
  const studentId = useAuthStore((s) => s.studentId);
  const {
    students,
    courses,
    enrollments,
    enroll,
    updateEnrollment,
    dropEnrollment,
  } = useEnrollmentStore();

  const me = students.find((s) => s.studentId === studentId);
  const myEnrollments = enrollments.filter((e) => e.studentId === studentId);
  const [open, setOpen] = useState(false);
  const [formCourse, setFormCourse] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const courseOptions = courses
    .filter((c) => !myEnrollments.some((e) => e.courseId === c.courseId))
    .map((c) => ({
      value: c.courseId,
      label: `${c.courseId} — ${c.courseTitle}`,
    }));

  const courseOf = (courseId: string) =>
    courses.find((c) => c.courseId === courseId);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setFormCourse(null);
      setServerError(null);
    }
  };

  const handleEnroll = async () => {
    if (!studentId || !formCourse) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await enroll(studentId, formCourse);
      handleOpenChange(false);
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDrop = async (courseId: string) => {
    if (!studentId) return;
    setDropError(null);
    try {
      await dropEnrollment(studentId, courseId);
    } catch (err) {
      setDropError((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">จัดการการลงทะเบียน</h1>
          <p className="text-sm text-muted-foreground">
            {me
              ? `${me.studentId} — ${me.firstName} ${me.lastName} (${me.program})`
              : (studentId ?? "-")}{" "}
            · ลงทะเบียนแล้ว {myEnrollments.length} วิชา
          </p>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button disabled={!studentId} />}>
            <PlusCircle className="h-4 w-4" />
            ลงทะเบียนเรียน
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>ลงทะเบียนเรียน</DialogTitle>
              <DialogDescription>
                เลือกวิชาที่ยังไม่ได้ลงทะเบียน
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
              <Label htmlFor="formCourse">วิชา</Label>
              <Select
                items={courseOptions}
                value={formCourse}
                onValueChange={(v) => setFormCourse(v as string)}
              >
                <SelectTrigger id="formCourse" className="w-full">
                  <SelectValue
                    placeholder={
                      courseOptions.length === 0
                        ? "ลงทะเบียนครบทุกวิชาแล้ว"
                        : "เลือกวิชา"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {courseOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}
            <DialogFooter>
              <Button
                disabled={!formCourse || submitting}
                onClick={handleEnroll}
              >
                <PlusCircle className="h-4 w-4" />
                {submitting ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {dropError && (
        <p className="text-sm text-destructive">
          ยกเลิกการลงทะเบียนไม่สำเร็จ: {dropError}
        </p>
      )}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัสวิชา</TableHead>
              <TableHead>ชื่อวิชา</TableHead>
              <TableHead>ผู้สอน</TableHead>
              <TableHead>วันที่ลงทะเบียน</TableHead>
              <TableHead className="w-24 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myEnrollments.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-20 text-center text-muted-foreground"
                >
                  ยังไม่ได้ลงทะเบียนวิชาใด
                </TableCell>
              </TableRow>
            )}
            {myEnrollments.map((e) => {
              const course = courseOf(e.courseId);
              return (
                <TableRow key={e.courseId}>
                  <TableCell>{e.courseId}</TableCell>
                  <TableCell>{course?.courseTitle ?? "-"}</TableCell>
                  <TableCell>{course?.instructors.join(", ") || "-"}</TableCell>
                  <TableCell>
                    {e.enrolledAt
                      ? new Date(e.enrolledAt).toLocaleString("th-TH")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <EnrollmentActions
                      enrollment={e}
                      courses={courses}
                      enrollments={enrollments}
                      onUpdate={(newCourseId) =>
                        updateEnrollment(e.studentId, e.courseId, newCourseId)
                      }
                      onDrop={() => handleDrop(e.courseId)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
